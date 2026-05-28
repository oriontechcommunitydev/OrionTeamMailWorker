import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { loadEmailSettings } from '../lib/settingsLoader'
import { sendEmail } from '../../src/lib/brevo'
import { renderTemplate, renderSubject, wrapWithEmailLayout } from '../../src/lib/templateEngine'
import { EmailQueueItem, EmailTemplate } from '../../src/lib/types'

const router = Router()

/**
 * Kuyruktaki belirli bir maili hemen gönderir
 * POST /queue/:id/send
 */
router.post('/queue/:id/send', async (req: Request, res: Response): Promise<void> => {
  const queueId = parseInt(req.params.id as string, 10)

  if (isNaN(queueId)) {
    res.status(400).json({ success: false, error: 'Geçersiz ID' })
    return
  }

  console.log(`[queueSend] İstek alındı, ID: ${queueId}`)

  try {
    // ── Ayarları yükle ──────────────────────────────────────
    let settings
    try {
      settings = await loadEmailSettings(supabase)
    } catch (err) {
      console.error('[queueSend] settings hatası:', err)
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

    // ── Queue item'ını getir ────────────────────────────────
    const { data: queueItem, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('id', queueId)
      .single()

    if (fetchError || !queueItem) {
      console.error('[queueSend] item getirme hatası:', fetchError)
      res.status(404).json({
        success: false,
        error: fetchError?.message ?? 'Mail kuyruk item bulunamadı'
      })
      return
    }

    const item = queueItem as EmailQueueItem

    // Zaten gönderilmiş veya başarısız ise uyar
    if (item.status === 'sent') {
      res.status(400).json({
        success: false,
        error: 'Bu mail zaten gönderilmiş',
        sent_at: item.sent_at
      })
      return
    }

    // ── Template'i çek ──────────────────────────────────────
    const { data: templateData, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_code', item.template_code)
      .eq('is_active', true)
      .single()

    if (templateError || !templateData) {
      console.error('[queueSend] template hatası:', templateError)
      const errMsg = `Template bulunamadı: '${item.template_code}'`

      // Status'u failed olarak güncelle
      await supabase
        .from('email_queue')
        .update({
          status: 'failed',
          error_message: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', queueId)

      res.status(404).json({
        success: false,
        error: errMsg
      })
      return
    }

    const template = templateData as EmailTemplate

    // ── Template render et ──────────────────────────────────
    const renderedHtml = renderTemplate(template.html_content, item.template_params)
    const wrappedHtml = wrapWithEmailLayout(renderedHtml, settings)
    const renderedSubject = renderSubject(template.subject, item.template_params)

    // ── Brevo payload hazırla ───────────────────────────────
    const payload = {
      sender: {
        name: settings.sender_name,
        email: settings.sender_email
      },
      to: [
        {
          email: item.recipient_email,
          name: item.recipient_name || item.recipient_email
        }
      ],
      subject: renderedSubject,
      htmlContent: wrappedHtml
    }

    // ── Brevo'ya gönder ─────────────────────────────────────
    let brevoMessageId: string
    try {
      const brevoResp = await sendEmail(payload, settings.brevo_api_key)
      brevoMessageId = brevoResp.messageId
      console.log(`[queueSend] ID:${queueId} Brevo'ya gönderildi, messageId: ${brevoMessageId}`)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Brevo ya gönderilemedi'
      console.error(`[queueSend] ID:${queueId} gönderim hatası:`, errMsg)

      // Hata durumunu kaydet
      await supabase
        .from('email_queue')
        .update({
          status: 'failed',
          error_message: errMsg,
          attempt_count: item.attempt_count + 1,
          last_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', queueId)

      res.status(500).json({
        success: false,
        error: errMsg
      })
      return
    }

    // ── Queue item'ı başarılı olarak işaretle ──────────────
    const { error: updateError } = await supabase
      .from('email_queue')
      .update({
        status: 'sent',
        brevo_message_id: brevoMessageId,
        sent_at: new Date().toISOString(),
        attempt_count: item.attempt_count + 1,
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId)

    if (updateError) {
      console.error('[queueSend] güncelleme hatası:', updateError)
      res.status(500).json({
        success: false,
        error: 'Durum güncellenemedi: ' + updateError.message
      })
      return
    }

    console.log(`[queueSend] ID:${queueId} başarıyla tamamlandı`)

    res.status(200).json({
      success: true,
      message: 'Mail başarıyla gönderildi',
      queue_id: queueId,
      recipient: item.recipient_email,
      message_id: brevoMessageId
    })

  } catch (err) {
    console.error('[queueSend] beklenmeyen hata:', err)
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Sunucu hatası'
    })
  }
})

/**
 * Kuyruktaki belirli bir maili siler
 * DELETE /queue/:id
 */
router.delete('/queue/:id', async (req: Request, res: Response): Promise<void> => {
  const queueId = parseInt(req.params.id as string, 10)

  if (isNaN(queueId)) {
    res.status(400).json({ success: false, error: 'Geçersiz ID' })
    return
  }

  try {
    const { error } = await supabase
      .from('email_queue')
      .delete()
      .eq('id', queueId)

    if (error) {
      res.status(500).json({ success: false, error: error.message })
      return
    }

    res.status(200).json({
      success: true,
      message: 'Mail kuyruktan silindi'
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Bilinmeyen hata'
    res.status(500).json({ success: false, error: errorMsg })
  }
})

export { router as queueSendRouter }
