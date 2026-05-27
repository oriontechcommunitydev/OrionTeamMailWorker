// ComposeEditor — HTML editör + canlı önizleme

'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { EmailSettings } from '../lib/types'
import { wrapWithEmailLayout } from '../lib/templateEngine'

interface ComposeEditorProps {
  value: string
  onChange: (html: string) => void
}

type PreviewMode = 'desktop' | 'mobile'

export default function ComposeEditor({ value, onChange }: ComposeEditorProps) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop')
  const [settings, setSettings] = useState<EmailSettings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState<boolean>(true)
  const [confirmClear, setConfirmClear] = useState<boolean>(false)

  useEffect(() => {
    const load = async () => {
      setLoadingSettings(true)
      try {
        const { data, error } = await supabase
          .from('email_settings')
          .select('setting_key, setting_value')

        if (error || !data) {
          setSettings(null)
          return
        }

        const map = data.reduce<Record<string, string>>((acc, row) => {
          acc[row.setting_key] = row.setting_value ?? ''
          return acc
        }, {})

        const next: EmailSettings = {
          brevo_api_key: map['brevo_api_key'] ?? '',
          sender_email: map['sender_email'] ?? '',
          sender_name: map['sender_name'] ?? '',
          daily_limit: parseInt(map['daily_limit'] ?? '300', 10),
          retry_limit: parseInt(map['retry_limit'] ?? '3', 10),
          enabled: map['enabled'] === 'true',
          sender_logo_url: map['sender_logo_url'] ?? null,
          sender_website: map['sender_website'] ?? null,
          sender_address: map['sender_address'] ?? null,
        }

        setSettings(next)
      } catch {
        setSettings(null)
      } finally {
        setLoadingSettings(false)
      }
    }

    void load()
  }, [])

  const previewHtml = useMemo(() => {
    if (!settings) return value
    return wrapWithEmailLayout(value, settings)
  }, [settings, value])

  const applyTag = (tag: string, openTag: string, closeTag: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      onChange(`${openTag}${closeTag}`)
      return
    }
    onChange(`${openTag}${trimmed}${closeTag}`)
  }

  const applyTemplate = async (templateKey: 'empty' | 'welcome' | 'announcement' | 'other') => {
    if (templateKey === 'empty') {
      if (value.trim().length > 0 && !confirmClear) {
        setConfirmClear(true)
        return
      }
      setConfirmClear(false)
      onChange('')
      return
    }

    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('html_content')
        // Mevcut şemaya göre alan adı: template_key (repo server tarafında da template_key kullanılıyor)
        // Eğer tabloda farklı isim varsa, tek noktadan güncellenir.
        .eq('template_key', templateKey)
        .maybeSingle()

      if (error || !data) return
      const nextHtml = (data as { html_content?: string }).html_content ?? ''

      if (value.trim().length > 0) {
        setConfirmClear(false)
      }

      onChange(nextHtml)
    } catch {
      // sessizce başarısız
    }
  }


  const effectiveMobileClass = previewMode === 'mobile' ? 'max-w-[375px] mx-auto' : 'max-w-none'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('edit')}
          className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
            tab === 'edit'
              ? 'bg-gray-900 border-gray-700 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          ✏️ Düzenle
        </button>
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
            tab === 'preview'
              ? 'bg-gray-900 border-gray-700 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          👁 Önizleme
        </button>
      </div>

      {tab === 'edit' && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyTag('b', '<strong>', '</strong>')}
              className="px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 hover:text-white hover:bg-gray-800"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => applyTag('i', '<em>', '</em>')}
              className="px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 hover:text-white hover:bg-gray-800"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => applyTag('h1', '<h1>', '</h1>')}
              className="px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 hover:text-white hover:bg-gray-800"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => applyTag('h2', '<h2>', '</h2>')}
              className="px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 hover:text-white hover:bg-gray-800"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => applyTag('p', '<p>', '</p>')}
              className="px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 hover:text-white hover:bg-gray-800"
            >
              P
            </button>

            <div className="flex-1" />

            <div className="text-xs text-gray-500">Şablonlar</div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void applyTemplate('empty')}
                className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs hover:bg-indigo-500/20"
              >
                📄 Boş
              </button>
              <button
                type="button"
                onClick={() => void applyTemplate('welcome')}
                className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs hover:bg-indigo-500/20"
              >
                👋 Hoş Geldin
              </button>
              <button
                type="button"
                onClick={() => void applyTemplate('announcement')}
                className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs hover:bg-indigo-500/20"
              >
                📢 Duyuru
              </button>
              <button
                type="button"
                onClick={() => void applyTemplate('other')}
                className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs hover:bg-indigo-500/20"
              >
                📝 Diğer
              </button>
            </div>
          </div>

          {confirmClear && value.trim().length > 0 && (
            <div className="text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
              Mevcut içerik silinecek. Devam için tekrar tıklayın.
            </div>
          )}

          <textarea
            value={value}
            onChange={(e) => {
              setConfirmClear(false)
              onChange(e.target.value)
            }}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 min-h-[300px] font-mono text-sm"
            placeholder="HTML içeriğini buraya yapıştırın..."
          />
        </div>
      )}

      {tab === 'preview' && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                className={`px-3 py-1.5 rounded-xl text-xs border ${
                  previewMode === 'desktop'
                    ? 'bg-gray-900 border-gray-700 text-white'
                    : 'bg-gray-900/0 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                💻 Masaüstü
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                className={`px-3 py-1.5 rounded-xl text-xs border ${
                  previewMode === 'mobile'
                    ? 'bg-gray-900 border-gray-700 text-white'
                    : 'bg-gray-900/0 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                📱 Mobil
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {loadingSettings ? 'Gönderici ayarları yükleniyor...' : 'wrapWithEmailLayout uygulanmış önizleme'}
            </div>
          </div>

          <div className={effectiveMobileClass}>
            <iframe
              title="Mail önizleme"
              sandbox="allow-same-origin allow-scripts"
              className="w-full min-h-[500px] bg-white rounded-xl border border-gray-200"
              srcDoc={previewHtml}
            />
          </div>
        </div>
      )}
    </div>
  )
}

