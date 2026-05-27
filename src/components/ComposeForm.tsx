// ComposeForm — Gmail benzeri manuel mail gönderim formu

'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Recipient, SendResult } from '../lib/types'
import RecipientInput from './RecipientInput'
import ComposeEditor from './ComposeEditor'
import { Loader2, Trash2 } from 'lucide-react'




const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

interface SenderInfo {
  name: string
  email: string
}

type ToPayload = Array<{ email: string; name: string; type: Recipient['type'] }>

type CcPayload = Array<{ email: string; name: string }>

function SendResultPanel({ result }: { result: SendResult }) {
  const { success, sent_count, failed_count, results } = result

  return (
    <div
      className={`rounded-2xl border p-4 ${success ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{success ? '✅ Gönderim tamamlandı' : '❌ Gönderim hatalı'}</div>
          <div className="text-xs text-gray-300 mt-1">
            {failed_count === 0
              ? `${sent_count} alıcıya mail gönderildi`
              : sent_count > 0
                ? `⚠️ ${sent_count} başarı / ${failed_count} hata`
                : `${failed_count} hata bulundu`}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {results.map((r) => (
          <div key={r.email} className="flex items-center justify-between gap-2 text-xs">
            <div className="text-gray-200 font-mono truncate">{r.email}</div>
            <div className={r.success ? 'text-emerald-300' : 'text-red-300'}>{r.success ? '✅' : '❌'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ComposeForm() {
  const [toRecipients, setToRecipients] = useState<Recipient[]>([])
  const [ccRecipients, setCcRecipients] = useState<Recipient[]>([])
  const [showCC, setShowCC] = useState<boolean>(false)
  const [subject, setSubject] = useState<string>('')
  const [htmlContent, setHtmlContent] = useState<string>('')

  const [senderInfo, setSenderInfo] = useState<SenderInfo | null>(null)

  const [isSending, setIsSending] = useState<boolean>(false)
  const [sendResult, setSendResult] = useState<SendResult | null>(null)
  const [error, setError] = useState<string | null>(null)



  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('email_settings')
          .select('setting_key, setting_value')

        if (error || !data) return

        const map = data.reduce<Record<string, string>>((acc, row) => {
          acc[row.setting_key] = row.setting_value ?? ''
          return acc
        }, {})

        setSenderInfo({
          name: map['sender_name'] ?? '',
          email: map['sender_email'] ?? '',
        })
      } catch {
        // ignore
      }
    }

    void load()
  }, [])



 {/*} useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch('/api/settings')

        if (!resp.ok) throw new Error('Ayarlar yüklenemedi')
        const json = (await resp.json()) as EmailSettings
        setSenderInfo({ name: json.sender_name, email: json.sender_email })
      } catch {
        setSenderInfo(null)
      }
    }

    void load()
  }, [])*/}

  const canSend = useMemo(() => {
    if (isSending) return false
    if (toRecipients.length === 0) return false
    if (subject.trim().length === 0) return false
    if (htmlContent.trim().length === 0) return false

    const all = [...toRecipients, ...ccRecipients]
    if (all.length > 50) return false

    for (const r of all) {
      if (!isValidEmail(r.email)) return false
      if (!r.name.trim()) return false
    }

    return true
  }, [ccRecipients, htmlContent, isSending, subject, toRecipients])

  const handleClear = () => {
    setToRecipients([])
    setCcRecipients([])
    setShowCC(false)
    setSubject('')
    setHtmlContent('')
    setSendResult(null)
    setError(null)
  }





  const handleSend = async () => {
    if (!canSend) return

    setIsSending(true)

    setError(null)
    setSendResult(null)

    try {
      // Brevo + manual_emails işlemleri server tarafında güvenli şekilde yapılmalı
      const toPayload: Array<{ email: string; name: string; type: Recipient['type'] }> = toRecipients.map((r) => ({

        email: r.email,
        name: r.name,
        type: r.type,
      }))

      const ccPayload: Array<{ email: string; name: string }> = showCC
        ? ccRecipients.map((r) => ({ email: r.email, name: r.name }))
        : []

      const resp = await fetch('/api/compose/send', {
        method: 'POST',

        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toPayload,
          cc: ccPayload,
          subject: subject.trim(),
          html_content: htmlContent,
        }),
      })

      const json = (await resp.json()) as SendResult & { error?: string }

      if (!resp.ok) {
        throw new Error(json.error ?? 'Gönderim başarısız')
      }

      setSendResult(json)
      handleClear()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gönderim hatası')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500/20 text-indigo-300 rounded-xl flex items-center justify-center">✉️</div>
          <div>
            <h2 className="text-base font-semibold text-white">✉️ Mail Gönder</h2>
            <p className="text-xs text-gray-400 mt-0.5">Üyeler, konuşmacılar ve dış alıcılar için manuel gönderim</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-200">Gönderen</div>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-semibold">
                {senderInfo?.name?.slice(0, 1).toUpperCase() ?? '—'}
              </div>
              <div>
                <div className="text-sm text-white font-medium">{senderInfo ? senderInfo.name : 'Yükleniyor...'}</div>
                <div className="text-xs text-gray-400 font-mono">{senderInfo ? senderInfo.email : ''}</div>
              </div>
            </div>
            <div className="text-xs text-gray-500">🔒</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-200">Alıcı (To) *</div>
          <RecipientInput value={toRecipients} onChange={setToRecipients} placeholder="İsim veya email ara..." />
        </div>

        <div>
          {!showCC && (
            <button
              type="button"
              onClick={() => setShowCC(true)}
              className="text-sm text-indigo-300 hover:text-indigo-200"
            >
              [+ CC Ekle]
            </button>
          )}

          {showCC && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-200">CC (Karbon Kopya)</div>
                <button
                  type="button"
                  onClick={() => setShowCC(false)}
                  className="text-xs text-gray-400 hover:text-gray-200"
                >
                  × Kaldır
                </button>
              </div>
              <RecipientInput value={ccRecipients} onChange={setCcRecipients} placeholder="CC ekle..." />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-200">Konu *</div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            placeholder="Konu girin..."
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-200">Mesaj *</div>
          <ComposeEditor value={htmlContent} onChange={setHtmlContent} />
        </div>

        {error && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">{error}</div>
        )}

        {sendResult && <SendResultPanel result={sendResult} />}

        <div className="flex flex-wrap items-center gap-2 justify-between">
          <button
            type="button"
            onClick={handleClear}
            disabled={isSending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-300 bg-gray-900 border border-gray-700 hover:bg-gray-800 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Temizle
          </button>

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-medium transition-colors"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gönderiliyor...
              </>
            ) : (
              <>📤 Gönder ({toRecipients.length} kişi)</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

