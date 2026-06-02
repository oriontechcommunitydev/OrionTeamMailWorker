import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { loadEmailSettings } from '../lib/settingsLoader'
import type { Recipient } from '../../src/lib/types'

const router = Router()

const MANUAL_TEMPLATE_CODE = 'manual_compose'

/**
 * Manuel Compose Form datasını email_queue'ya ekler.
 * Worker kuyruktan okuyup email_templates[template_code] ile render eder.
 *
 * POST /queue/enqueue-manual
 */
router.post('/queue/enqueue-manual', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as {
      to?: Recipient[]
      cc?: Array<{ email: string; name: string }>
      subject?: string
      html_content?: string
    }

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

    // Settings
    const settings = await loadEmailSettings(supabase)
    if (!settings.enabled) {
      res.status(503).json({ success: false, error: 'Mail sistemi devre dışı' })
      return
    }

    // Not: Worker email_templates kullanarak render ettiği için normalde template_code doğrulanır.
    // Ancak manuel enqueue hedefinde kullanıcı akışı bozulmasın diye template var/yok kontrolü yapmadan enqueue ediyoruz.
    // Worker veya tekil gönderimde template bulunamazsa item 'failed' olur.


    const priority: 'low' | 'medium' | 'high' = 'medium'

    // Her To alıcı için ayrı queue item ekleyelim (queue worker tek recipient gönderiyor)
    // email_queue table'ında template_code foreign key constraint'i var.
    // Bu yüzden manuel template_code için zorunlu olarak email_templates tablosunda aktif bir kayıt olmalı.
    // Hataları HTTP 500 yerine kullanıcıya anlaşılır dönelim.
    const insertRows = body.to.map((r) => ({
      recipient_email: r.email,
      recipient_name: r.name ?? null,
      template_code: MANUAL_TEMPLATE_CODE,
      template_params: {
        subject: body.subject!.trim(),
        html_content: body.html_content!,
      } as Record<string, string>,

      priority,
      status: 'pending',
      attempt_count: 0,
      last_attempt_at: null,
      sent_at: null,
      error_message: null,
      brevo_message_id: null,
    }))


    const { data: inserted, error: insertErr } = await supabase
      .from('email_queue')
      .insert(insertRows)
      .select('id')

    if (insertErr) {
      res.status(500).json({ success: false, error: insertErr.message })
      return
    }

    res.status(200).json({
      success: true,
      message: 'Mail kuyruga eklendi',
      queue_ids: (inserted ?? []).map((r: any) => r.id),
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Sunucu hatası',
    })
  }
})

export { router as queueEnqueueManualRouter }

