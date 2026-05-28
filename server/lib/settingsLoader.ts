// email_settings tablosundan ayarları yükler
// key-value formatından EmailSettings objesine dönüştürür

import type { SupabaseClient } from '@supabase/supabase-js'

export interface EmailSettings {
  brevo_api_key: string
  sender_email: string
  sender_name: string
  daily_limit: number
  retry_limit: number
  enabled: boolean

  sender_logo_url: string | null
  sender_website: string | null
  sender_address: string | null
}

export interface EmailSettingRaw {
  id: number
  setting_key: string
  setting_value: string | null
  updated_at: string
}

export async function loadEmailSettings(supabase: SupabaseClient): Promise<EmailSettings> {
  const { data, error } = await supabase
    .from('email_settings')
    .select('*')

  if (error) {
    throw new Error(`[Mailer] email_settings yüklenemedi: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error('[Mailer] email_settings tablosu boş veya erişilemiyor.')
  }

  // key-value array → objeye dönüştür
  const settingsMap: Record<string, string | null> = {}
  ;(data as EmailSettingRaw[]).forEach((row) => {
    settingsMap[row.setting_key] = row.setting_value
  })

  // Zorunlu alanları kontrol et
  const requiredKeys = ['brevo_api_key', 'sender_email', 'sender_name', 'daily_limit', 'retry_limit', 'enabled']
  for (const key of requiredKeys) {
    if (!(key in settingsMap)) {
      throw new Error(`[Mailer] Eksik ayar: '${key}' email_settings tablosunda bulunamadı.`)
    }
  }

  return {
    brevo_api_key: settingsMap['brevo_api_key'] ?? '',
    sender_email: settingsMap['sender_email'] ?? '',
    sender_name: settingsMap['sender_name'] ?? '',
    daily_limit: parseInt(settingsMap['daily_limit'] ?? '300', 10),
    retry_limit: parseInt(settingsMap['retry_limit'] ?? '3', 10),
    enabled: settingsMap['enabled'] === 'true',

    sender_logo_url: settingsMap['sender_logo_url'] ?? null,
    sender_website: settingsMap['sender_website'] ?? null,
    sender_address: settingsMap['sender_address'] ?? null,
  }
}
