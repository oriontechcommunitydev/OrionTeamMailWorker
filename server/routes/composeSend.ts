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

type SendResult = {
  success: boolean
  sent_count: number
  failed_count: number
  results: Array<{
    email: string
    success: boolean
    messageId?: string
    error?: string
  }>
}

export const composeSendRouter = Router()

composeSendRouter.post('/', async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  const { to, cc, subject, html_content, sent_by } = parsed.data

  // Spec: toplam alıcı (to + cc) max 50
  const totalRecipients = to.length + (cc?.length ?? 0)
  if (totalRecipients > 50) {
    return res.status(400).json({ error: 'Toplam alıcı max 50 olmalıdır' })
  }

  const settings = await (async () => {

    try {
      return await loadEmailSettings(supabase)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Settings load error'
      throw new Error(message)
    }
  })()

  if (!settings.enabled) {
    return res.status(503).json({ error: 'Mail sistemi devre dışı' })
  }

  // manual_emails kaydı
  const sender_name = settings.sender_name
  const sender_email = settings.sender_email

  const to_emails = to.map((r) => ({ email: r.email, name: r.name, type: r.type }))
  const cc_emails = (cc ?? []).map((r) => ({ email: r.email, name: r.name }))

  const { data: manualRow, error: manualErr } = await supabase
    .from('manual_emails')
    .insert({
      sender_name,
      sender_email,
      to_emails,
      cc_emails,
      subject,
      html_content,
      status: 'pending',
      brevo_message_ids: [],
      error_message: null,
      sent_by: sent_by ?? null,
      sent_at: null,
    })
    .select('*')
    .single()

  if (manualErr || !manualRow) {
    return res.status(500).json({ error: manualErr?.message ?? 'manual_emails insert error' })
  }

  const results: SendResult['results'] = []
  const messageIds: string[] = []
  const errors: string[] = []

  for (const r of to) {
    try {
      const wrapped = wrapWithEmailLayout(html_content, settings)

      const response = await sendEmail(
        {
          sender: { name: settings.sender_name, email: settings.sender_email },
          to: [{ email: r.email, name: r.name }],
          cc: cc?.length ? cc.map((x) => ({ email: x.email, name: x.name })) : undefined,
          subject,
          htmlContent: wrapped,
        },
        settings.brevo_api_key,
      )

      messageIds.push(response.messageId)
      results.push({ email: r.email, success: true, messageId: response.messageId })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Brevo send error'
      errors.push(errorMessage)
      results.push({ email: r.email, success: false, error: errorMessage })
    }
  }

  const sent_count = results.filter((x) => x.success).length
  const failed_count = results.filter((x) => !x.success).length

  const status: 'sent' | 'failed' = failed_count === 0 ? 'sent' : sent_count === 0 ? 'failed' : 'sent'

  let finalErrorMessage: string | null = null
  if (failed_count === 0) {
    finalErrorMessage = null
  } else if (sent_count > 0) {
    // Spec: kısmi başarı
    finalErrorMessage = 'Kısmi başarı'
  } else {
    finalErrorMessage = errors.slice(0, 3).join(' | ')
  }


  await supabase
    .from('manual_emails')
    .update({
      status,
      brevo_message_ids: messageIds,
      error_message: finalErrorMessage,
      sent_by: sent_by ?? null,
      sent_at: new Date().toISOString(),
    })
    .eq('id', manualRow.id)

  const responseBody: SendResult = {
    success: failed_count === 0,
    sent_count,
    failed_count,
    results,
  }

  return res.status(200).json(responseBody)
})

