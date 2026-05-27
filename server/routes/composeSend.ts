import { Router } from 'express'
import { z } from 'zod'

import { supabase } from '../../src/lib/supabaseClient'
import { loadEmailSettings } from '../../src/lib/settingsLoader'
import { wrapWithEmailLayout } from '../../src/lib/templateEngine'
import { sendEmail } from '../../src/lib/brevo'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const recipientToSchema = z.object({
  email: z.string().regex(emailRegex),
  name: z.string().min(1),
  type: z.enum(['member', 'speaker', 'external']),
})

const recipientCcSchema = z.object({
  email: z.string().regex(emailRegex),
  name: z.string().min(1),
})

const bodySchema = z.object({
  to: z.array(recipientToSchema).min(1).max(50),
  cc: z.array(recipientCcSchema).optional().default([]),
  subject: z.string().min(1).max(500),
  html_content: z.string().min(1),
  sent_by: z.string().optional(),
})

export type ComposePayload = z.infer<typeof bodySchema>

type SendResultItem = {
  email: string
  success: boolean
  messageId?: string
  error?: string
}

type SendResult = {
  success: boolean
  sent_count: number
  failed_count: number
  results: SendResultItem[]
}

export const composeSendRouter = Router()

composeSendRouter.post('/compose/send', async (req, res) => {
  try {
    const body = req.body as unknown as ComposePayload

    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
      })
    }

    const validatedBody = parsed.data

    // Validasyon
    if (!validatedBody.to || validatedBody.to.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'En az bir alıcı gerekli',
      })
    }

    if (!validatedBody.subject || validatedBody.subject.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Konu boş olamaz',
      })
    }

    if (!validatedBody.html_content || validatedBody.html_content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'İçerik boş olamaz',
      })
    }

    // Settings yükle
    const settings = await loadEmailSettings(supabase)
    if (!settings.enabled) {
      return res.status(503).json({
        success: false,
        error: 'Mail sistemi devre dışı',
      })
    }

    // manual_emails'e kaydet
    const { data: inserted, error: insertError } = await supabase
      .from('manual_emails')
      .insert({
        sender_name: settings.sender_name,
        sender_email: settings.sender_email,
        to_emails: validatedBody.to.map((r) => ({
          email: r.email,
          name: r.name,
          type: r.type,
        })),
        cc_emails: (validatedBody.cc ?? []).map((c) => ({
          email: c.email,
          name: c.name,
        })),
        subject: validatedBody.subject,
        html_content: validatedBody.html_content,
        status: 'pending',
        brevo_message_ids: [],
        sent_by: validatedBody.sent_by ?? null,
      })
      .select()
      .single()

    if (insertError || !inserted) {
      return res.status(500).json({
        success: false,
        error: insertError?.message ?? 'Kayıt oluşturulamadı',
      })
    }

    // Her alıcıya ayrı Brevo isteği
    const results: SendResultItem[] = []
    const messageIds: string[] = []

    const wrappedHtml = wrapWithEmailLayout(validatedBody.html_content, settings)

    for (const recipient of validatedBody.to) {
      try {
        const brevoResp = await sendEmail(
          {
            sender: {
              name: settings.sender_name,
              email: settings.sender_email,
            },
            to: [{ email: recipient.email, name: recipient.name }],
            cc: (validatedBody.cc ?? []).map((c) => ({
              email: c.email,
              name: c.name,
            })),
            subject: validatedBody.subject,
            htmlContent: wrappedHtml,
          },
          settings.brevo_api_key,
        )

        messageIds.push(brevoResp.messageId)
        results.push({
          email: recipient.email,
          success: true,
          messageId: brevoResp.messageId,
        })
      } catch (err) {
        results.push({
          email: recipient.email,
          success: false,
          error: err instanceof Error ? err.message : 'Gönderilemedi',
        })
      }
    }

    // Sonuçları hesapla
    const sentCount = results.filter((r) => r.success).length
    const failedCount = results.filter((r) => !r.success).length

    // manual_emails güncelle
    const newStatus =
      failedCount === 0 ? 'sent' : sentCount === 0 ? 'failed' : 'sent'

    await supabase
      .from('manual_emails')
      .update({
        status: newStatus,
        brevo_message_ids: messageIds,
        error_message:
          failedCount > 0 ? `${failedCount} alıcıya gönderilemedi` : null,
        sent_at: new Date().toISOString(),
      })
      .eq('id', inserted.id)

    // Her zaman JSON dön
    return res.status(200).json({
      success: failedCount === 0,
      sent_count: sentCount,
      failed_count: failedCount,
      results,
    })
  } catch (err) {
    // Beklenmeyen hata — her zaman JSON dön
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Sunucu hatası',
      sent_count: 0,
      failed_count: 0,
      results: [],
    })
  }
})

