// Ayarlar paneli — email_settings tablosunu okur ve günceller

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { EmailSettingRaw } from '../lib/types'
import { Settings, Save, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

interface SettingField {
  key: string
  label: string
  type: 'text' | 'password' | 'number' | 'toggle'
  placeholder?: string
  description?: string
}

const SETTING_FIELDS: SettingField[] = [
  {
    key: 'brevo_api_key',
    label: 'Brevo API Anahtarı',
    type: 'password',
    placeholder: 'xkeysib-...',
    description: 'Brevo hesabınızdan alınan API anahtarı',
  },
  {
    key: 'sender_email',
    label: 'Gönderici E-posta',
    type: 'text',
    placeholder: 'noreply@example.com',
    description: 'Mail gönderiminde görünen e-posta adresi',
  },
  {
    key: 'sender_name',
    label: 'Gönderici Adı',
    type: 'text',
    placeholder: 'Orion Tech Community',
    description: 'Mail gönderiminde görünen isim',
  },
  {
    key: 'sender_logo_url',
    label: 'Logo URL',
    type: 'text',
    placeholder: 'https://...',
    description: 'Logo email header’ında görünür. Önerilen: 200x60px PNG',
  },
  {
    key: 'sender_website',
    label: 'Website URL',
    type: 'text',
    placeholder: 'https://oriontech.com',
    description: 'Footer’da bağlantı olarak gösterilir (opsiyonel)',
  },
  {
    key: 'sender_address',
    label: 'Adres (Footer)',
    type: 'text',
    placeholder: 'İstanbul, Türkiye',
    description: 'Footer’da adres olarak gösterilir (opsiyonel)',
  },

  {
    key: 'daily_limit',
    label: 'Günlük Mail Limiti',
    type: 'number',
    placeholder: '300',
    description: 'Günde gönderilebilecek maksimum mail sayısı',
  },

  {
    key: 'retry_limit',
    label: 'Maksimum Deneme Sayısı',
    type: 'number',
    placeholder: '3',
    description: 'Başarısız maillerin kaç kez tekrar deneneceği',
  },
  {
    key: 'enabled',
    label: 'Mail Gönderimi',
    type: 'toggle',
    description: 'Mail gönderimini etkinleştir veya devre dışı bırak',
  },
]


function maskApiKey(value: string): string {
  if (value.length <= 10) return '****'
  return value.substring(0, 8) + '****' + value.substring(value.length - 4)
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<Record<string, 'success' | 'error'>>({})
  const [showApiKey, setShowApiKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.from('email_settings').select('*')
    if (err) {
      setError(err.message)
    } else {
      const map: Record<string, string> = {}
      ;(data as EmailSettingRaw[]).forEach((row) => {
        map[row.setting_key] = row.setting_value ?? ''
      })
      setSettings(map)
    }
    setLoading(false)
  }

  async function saveSetting(key: string, value: string) {
    setSaving(key)
    const { error: err } = await supabase
      .from('email_settings')
      .upsert({ setting_key: key, setting_value: value, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' })

    if (err) {
      setSaveStatus((s) => ({ ...s, [key]: 'error' }))
    } else {
      setSaveStatus((s) => ({ ...s, [key]: 'success' }))
      setTimeout(() => setSaveStatus((s) => { const n = { ...s }; delete n[key]; return n }), 2000)
    }
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 animate-pulse">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="w-32 h-4 bg-gray-700 rounded mb-2" />
              <div className="w-full h-10 bg-gray-700 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>Ayarlar yüklenemedi: {error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b border-gray-700">
        <div className="w-8 h-8 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center">
          <Settings className="w-4 h-4" />
        </div>
        <h2 className="text-base font-semibold text-white">Sistem Ayarları</h2>
      </div>

      <div className="p-5 space-y-5">
        {SETTING_FIELDS.map((field) => {
          const isApiKeyField = field.key === 'brevo_api_key'

          return (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-300">
                  {field.label}
                </label>
                {saveStatus[field.key] === 'success' && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle className="w-3 h-3" /> Kaydedildi
                  </span>
                )}
                {saveStatus[field.key] === 'error' && (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <AlertTriangle className="w-3 h-3" /> Hata
                  </span>
                )}
              </div>

              {field.description && (
                <p className="text-xs text-gray-500 mb-2">{field.description}</p>
              )}

              {field.type === 'toggle' ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const newVal = settings[field.key] === 'true' ? 'false' : 'true'
                      setSettings((s) => ({ ...s, [field.key]: newVal }))
                      void saveSetting(field.key, newVal)
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings[field.key] === 'true' ? 'bg-emerald-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings[field.key] === 'true' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm ${settings[field.key] === 'true' ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {settings[field.key] === 'true' ? 'Etkin' : 'Devre Dışı'}
                  </span>
                </div>
              ) : field.type === 'password' ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={settings[field.key] ?? ''}
                      onChange={(e) => setSettings((s) => ({ ...s, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 pr-10"
                    />
                    <button
                      onClick={() => setShowApiKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={() => saveSetting(field.key, settings[field.key] ?? '')}
                    disabled={saving === field.key}
                    className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {saving === field.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
              ) : isApiKeyField ? (
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings[field.key] ?? ''}
                    onChange={(e) => setSettings((s) => ({ ...s, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className=" w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 pr-10"
                  />
                  <button
                    onClick={() => setShowApiKey((v) => !v)}
                    className="-ml-10 self-center text-gray-500 hover:text-gray-300"
                    aria-label={showApiKey ? 'API key’i gizle' : 'API key’i göster'}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => saveSetting(field.key, settings[field.key] ?? '')}
                    disabled={saving === field.key}
                    className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {saving === field.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={settings[field.key] ?? ''}
                    onChange={(e) => setSettings((s) => ({ ...s, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="flex-1 bg-gray-900 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => saveSetting(field.key, settings[field.key] ?? '')}
                    disabled={saving === field.key}
                    className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {saving === field.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Logo preview */}
        <div className="pt-1">
          <div className="text-xs text-gray-400 mb-1">Logo Önizleme</div>
          {settings['sender_logo_url'] ? (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 flex items-center justify-center">
              <img
                src={settings['sender_logo_url']}
                alt="sender logo"
                className="max-h-14 max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-500">
              Logo URL girilmemiş
            </div>
          )}
        </div>

        {/* Maskelenmiş API key gösterimi */}
        {settings['brevo_api_key'] && !showApiKey && (
          <div className="text-xs text-gray-600 mt-1">
            Mevcut: <span className="font-mono">{maskApiKey(settings['brevo_api_key'])}</span>
          </div>
        )}
      </div>
    </div>
  )
}

