// Email Queue Worker — Supabase'den kuyruk okur, Brevo ile gönderir

import { supabase } from './supabaseClient'
import { loadEmailSettings } from './settingsLoader'
import { renderTemplate, renderSubject, wrapWithEmailLayout } from './templateEngine'

import { sendEmail, BrevoError } from './brevo'
import { EmailQueueItem, EmailTemplate, WorkerResult } from './types'

function log(message: string): void {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  console.log(`[Mailer] [${now}] ${message}`)
}

/**
 * Email kuyruğunu işler.
 * pending durumundaki mailleri alır ve Brevo API üzerinden gönderir.
 */
export async function processEmailQueue(): Promise<WorkerResult> {
  log('Queue işleme başlatıldı.')

  // ── ADIM 1: Ayarları yükle ──────────────────────────────────────────────
  let settings
  try {
    settings = await loadEmailSettings(supabase)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ayarlar yüklenemedi'
    log(`HATA: ${message}`)
    return { success: false, sent: 0, failed: 0, skipped: 0, message }
  }

  if (!settings.enabled) {
    log('Mail gönderimi devre dışı (enabled=false). İşlem durduruldu.')
    return { success: true, sent: 0, failed: 0, skipped: 0, message: 'Mail gönderimi devre dışı.' }
  }

  // ── ADIM 2: Günlük limit kontrolü ──────────────────────────────────────
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count: sentTodayCount, error: countError } = await supabase
    .from('email_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', todayStart.toISOString())

  if (countError) {
    log(`HATA: Günlük sayım alınamadı: ${countError.message}`)
    return { success: false, sent: 0, failed: 0, skipped: 0, message: countError.message }
  }

  const sentToday = sentTodayCount ?? 0

  if (sentToday >= settings.daily_limit) {
    const msg = `Günlük limit doldu: ${sentToday}/${settings.daily_limit}`
    log(msg)
    return { success: true, sent: 0, failed: 0, skipped: 0, message: msg }
  }

  // Bu batch'te kaç mail gönderebiliriz?
  const batchSize = Math.min(50, settings.daily_limit - sentToday)

  // ── ADIM 3: Pending kayıtları çek ──────────────────────────────────────
  // Öncelik sırası: high → medium → low, ardından created_at ASC
  const { data: queueItems, error: queueError } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .lt('attempt_count', settings.retry_limit)
    .order('priority', { ascending: false }) // high > medium > low (alfabetik değil)
    .order('created_at', { ascending: true })
    .limit(batchSize)

  if (queueError) {
    log(`HATA: Kuyruk alınamadı: ${queueError.message}`)
    return { success: false, sent: 0, failed: 0, skipped: 0, message: queueError.message }
  }

  if (!queueItems || queueItems.length === 0) {
    log('İşlenecek pending mail yok.')
    return { success: true, sent: 0, failed: 0, skipped: 0, message: 'İşlenecek mail yok.' }
  }

  // Önceliğe göre manuel sıralama (enum sırası: high > medium > low)
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  const items = (queueItems as EmailQueueItem[]).sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 1
    const pb = priorityOrder[b.priority] ?? 1
    if (pa !== pb) return pa - pb
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  log(`${items.length} mail işlenecek (bugün ${sentToday}/${settings.daily_limit} gönderildi).`)

  let sentCount = 0
  let failedCount = 0

  // ── ADIM 4: Her mail için sırayla işle ────────────────────────────────
  for (const item of items) {
    // 4a. Attempt sayısını artır
    const newAttemptCount = item.attempt_count + 1
    await supabase
      .from('email_queue')
      .update({
        attempt_count: newAttemptCount,
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    // 4b. Template'i çek
    const { data: templateData, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_code', item.template_code)
      .eq('is_active', true)
      .single()

    if (templateError || !templateData) {
      const errMsg = `Template bulunamadı: '${item.template_code}'`
      log(`[ID:${item.id}] HATA: ${errMsg}`)

      await supabase
        .from('email_queue')
        .update({
          status: 'failed',
          error_message: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      await insertLog(item, 'failed', newAttemptCount, errMsg)
      failedCount++
      continue
    }

    const template = templateData as EmailTemplate

    // 4c. Template render
    const renderedHtml = renderTemplate(template.html_content, item.template_params)
    const wrappedHtml = wrapWithEmailLayout(renderedHtml, settings)
    const renderedSubject = renderSubject(template.subject, item.template_params)






    // 4d. Brevo'ya gönder


    try {
      const brevoPayload = {
        sender: {
          name: settings.sender_name,
          email: settings.sender_email,
        },
        to: [
          {
            email: item.recipient_email,
            name: item.recipient_name ?? undefined,
          },
        ],
        subject: renderedSubject,
        htmlContent: wrappedHtml,

        templateId: template.brevo_template_id ?? undefined,
        params: template.brevo_template_id ? item.template_params : undefined,
      }

      const response = await sendEmail(brevoPayload, settings.brevo_api_key)

      // 4e. Başarılı
      await supabase
        .from('email_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          brevo_message_id: response.messageId,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      await insertLog(item, 'sent', newAttemptCount, undefined, response.messageId)
      log(`[ID:${item.id}] ✓ Gönderildi → ${item.recipient_email} (messageId: ${response.messageId})`)
      sentCount++
    } catch (err) {
      // 4f. Hata
      let errMsg = err instanceof Error ? err.message : 'Bilinmeyen hata'
      let shouldMarkFailed = newAttemptCount >= settings.retry_limit

      // Brevo 4xx → direkt failed, retry yapma
      if (err instanceof BrevoError && !err.retryable) {
        shouldMarkFailed = true
        log(`[ID:${item.id}] 4xx hatası, retry yapılmayacak.`)
      }

      const newStatus = shouldMarkFailed ? 'failed' : 'pending'

      await supabase
        .from('email_queue')
        .update({
          status: newStatus,
          error_message: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      await insertLog(item, 'failed', newAttemptCount, errMsg)
      log(`[ID:${item.id}] ✗ Hata → ${item.recipient_email}: ${errMsg} (status: ${newStatus})`)
      failedCount++
    }
  }

  const msg = `İşlem tamamlandı: ${sentCount} gönderildi, ${failedCount} başarısız.`
  log(msg)

  return {
    success: true,
    sent: sentCount,
    failed: failedCount,
    skipped: 0,
    message: msg,
  }
}

/**
 * email_send_logs tablosuna kayıt ekler.
 */
async function insertLog(
  item: EmailQueueItem,
  eventType: 'sent' | 'failed',
  attempt: number,
  errorMessage?: string,
  messageId?: string
): Promise<void> {
  const eventData: Record<string, unknown> = { attempt }
  if (errorMessage) eventData['error'] = errorMessage
  if (messageId) eventData['messageId'] = messageId

  const { error } = await supabase.from('email_send_logs').insert({
    queue_id: item.id,
    recipient_email: item.recipient_email,
    template_code: item.template_code,
    event_type: eventType,
    event_data: eventData,
  })

  if (error) {
    console.warn(`[Mailer] Log eklenemedi (ID:${item.id}): ${error.message}`)
  }
}
