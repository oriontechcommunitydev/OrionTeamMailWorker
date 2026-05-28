import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { loadEmailSettings } from '../lib/settingsLoader'
import { sendEmail } from '../../src/lib/brevo'
import { wrapWithEmailLayout } from '../../src/lib/templateEngine'

const router = Router()

router.post('/compose/send', async (req: Request, res: Response): Promise<void> => {
  console.log('[composeSend] istek alındı, body keys:', Object.keys(req.body ?? {}))

  try {
    const body = req.body as {
      to?          : Array<{ email: string; name: string; type: string }>
      cc?          : Array<{ email: string; name: string }>
      subject?     : string
      html_content?: string
      sent_by?     : string
    }

    // ── Validasyon ──────────────────────────────────────
    if (!body.to || body.to.length === 0) {
      res.status(400).json({ success: false, error: 'En az bir alıcı gerekli' })
      return
    }
    if (!body.subject || body.subject.trim() === '') {
      res.status(400).json({ success: false, error: 'Konu boş olamaz' })
      return
    }
    if (!body.html_content || body.html_content.trim() === '') {
      res.status(400).json({ success: false, error: 'İçerik boş olamaz' })
      return
    }

    // ── Settings ─────────────────────────────────────────
    let settings: Awaited<ReturnType<typeof loadEmailSettings>>
    try {
      settings = await loadEmailSettings(supabase)
    } catch (err) {
      console.error('[composeSend] settings hatası:', err)
      res.status(500).json({
        success: false,
        error: 'Ayarlar yüklenemedi: ' + (err instanceof Error ? err.message : 'Bilinmeyen')
      })
      return
    }

    if (!settings.enabled) {
      res.status(503).json({ success: false, error: 'Mail sistemi devre dışı' })
      return
    }

    // ── DB Kayıt ─────────────────────────────────────────
    const { data: inserted, error: insertError } = await supabase
      .from('manual_emails')
      .insert({
        sender_name      : settings.sender_name,
        sender_email     : settings.sender_email,
        to_emails        : body.to,
        cc_emails        : body.cc ?? [],
        subject          : body.subject,
        html_content     : body.html_content,
        status           : 'pending',
        brevo_message_ids: [],
        sent_by          : body.sent_by ?? null,
      })
      .select()
      .single()

    if (insertError || !inserted) {
      console.error('[composeSend] insert hatası:', insertError)
      res.status(500).json({
        success: false,
        error: insertError?.message ?? 'DB kayıt hatası'
      })
      return
    }

    console.log('[composeSend] DB kaydı oluştu, id:', inserted.id)

    // ── Brevo Gönderim ───────────────────────────────────
    const results: Array<{
      email    : string
      success  : boolean
      messageId?: string
      error?   : string
    }> = []
    const messageIds: string[] = []

    const wrappedHtml = wrapWithEmailLayout(body.html_content, settings)

    for (const recipient of body.to) {
      try {
        const brevoResp = await sendEmail(
          {
            sender     : { name: settings.sender_name, email: settings.sender_email },
            to         : [{ email: recipient.email, name: recipient.name }],
            cc         : body.cc ?? [],
            subject    : body.subject,
            htmlContent: wrappedHtml,
          },
          settings.brevo_api_key
        )
        messageIds.push(brevoResp.messageId)
        results.push({ email: recipient.email, success: true, messageId: brevoResp.messageId })
        console.log('[composeSend] gönderildi:', recipient.email)
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Gönderilemedi'
        results.push({ email: recipient.email, success: false, error: errMsg })
        console.error('[composeSend] gönderim hatası:', recipient.email, errMsg)
      }
    }

    const sentCount   = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    // ── DB Güncelle ──────────────────────────────────────
    await supabase
      .from('manual_emails')
      .update({
        status           : sentCount > 0 ? 'sent' : 'failed',
        brevo_message_ids: messageIds,
        error_message    : failedCount > 0 ? `${failedCount} alıcıya gönderilemedi` : null,
        sent_at          : new Date().toISOString(),
      })
      .eq('id', inserted.id)

    console.log(`[composeSend] tamamlandı: ${sentCount} gönderildi, ${failedCount} hata`)

    // ── HER ZAMAN JSON DÖN ───────────────────────────────
    res.status(200).json({
      success     : failedCount === 0,
      sent_count  : sentCount,
      failed_count: failedCount,
      results,
    })

  } catch (err) {
    console.error('[composeSend] beklenmeyen hata:', err)
    res.status(500).json({
      success     : false,
      error       : err instanceof Error ? err.message : 'Sunucu hatası',
      sent_count  : 0,
      failed_count: 0,
      results     : [],
    })
  }
})

export { router as composeSendRouter }

