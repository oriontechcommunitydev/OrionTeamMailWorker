import { Router } from 'express'
import { z } from 'zod'

import { supabase } from '../lib/supabase'
import { loadEmailSettings } from '../lib/settingsLoader'
import { renderTemplate, renderSubject, wrapWithEmailLayout } from '../../src/lib/templateEngine'
import type { EmailQueueItem, EmailTemplate } from '../../src/lib/types'

const router = Router()

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

type QueueDetailResponse = {
  id: number
  status: EmailQueueItem['status']
  created_at: string
  sent_at: string | null
  error_message: string | null
  recipient_email: string
  recipient_name: string | null
  subject: string
  html_content: string
}

/**
 * Kuyruktaki belirli bir mailin detayını (render edilmiş html + subject) döndürür.
 * GET /api/queue/:id/detail
 */
router.get('/queue/:id/detail', async (req, res) => {
  const parsed = paramsSchema.safeParse({ id: req.params.id })
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Geçersiz ID' })
    return
  }

  const queueId = parsed.data.id

  try {
    // ── Ayarları yükle ──────────────────────────────────────
    let settings
    try {
      settings = await loadEmailSettings(supabase)
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Ayarlar yüklenemedi: ' + (err instanceof Error ? err.message : 'Bilinmeyen'),
      })
      return
    }

    // ── Queue item'ını çek ────────────────────────────────
    const { data: queueItem, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('id', queueId)
      .single()

    if (fetchError || !queueItem) {
      res.status(404).json({
        success: false,
        error: fetchError?.message ?? 'Mail kuyruk item bulunamadı',
      })
      return
    }

    const item = queueItem as EmailQueueItem

    // ── Template'i çek (aktif) ─────────────────────────────
    const { data: templateData, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_code', item.template_code)
      .eq('is_active', true)
      .single()

    if (templateError || !templateData) {
      const errMsg = `Template bulunamadı: '${item.template_code}'`
      res.status(404).json({ success: false, error: errMsg })
      return
    }

    const template = templateData as EmailTemplate

    // ── Render et ──────────────────────────────────────────
    const renderedHtml = renderTemplate(template.html_content, item.template_params)
    const wrappedHtml = wrapWithEmailLayout(renderedHtml, settings)
    const renderedSubject = renderSubject(template.subject, item.template_params)

    const response: QueueDetailResponse = {
      id: item.id,
      status: item.status,
      created_at: item.created_at,
      sent_at: item.sent_at,
      error_message: item.error_message,
      recipient_email: item.recipient_email,
      recipient_name: item.recipient_name,
      subject: renderedSubject,
      html_content: wrappedHtml,
    }

    res.status(200).json({ success: true, data: response })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Sunucu hatası',
    })
  }
})

export { router as queueDetailRouter }

