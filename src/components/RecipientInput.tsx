// RecipientInput — to/cc alanına recipient arama + seçim

'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Recipient, RecipientSearchResult } from '../lib/types'
import RecipientBadge from './RecipientBadge'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface RecipientInputProps {
  value: Recipient[]
  onChange: (r: Recipient[]) => void
  placeholder: string
}

type RecipientType = Recipient['type']

function toRecipientFromSearchRow(row: RecipientSearchResult): Recipient {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    type: row.type,
    avatar: row.avatar,
  }
}

function buildExternalRecipient(email: string): Recipient {
  return {
    email,
    name: email.split('@')[0] || email,
    type: 'external',
    avatar: null,
  }
}

export default function RecipientInput({ value, onChange, placeholder }: RecipientInputProps) {
  const [query, setQuery] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [results, setResults] = useState<RecipientSearchResult[]>([])
  const [open, setOpen] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const selectedEmails = useMemo(() => new Set<string>(value.map((v) => v.email.toLowerCase())), [value])

  useEffect(() => {
    setError(null)
  }, [query])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    const t = window.setTimeout(async () => {
      setLoading(true)
      try {
        const resp = await fetch(`/api/recipients?q=${encodeURIComponent(query.trim())}&type=all`)
        if (!resp.ok) {
          throw new Error(`Arama başarısız (${resp.status})`)
        }
        const json = (await resp.json()) as { data: RecipientSearchResult[] }
        setResults(json.data ?? [])
        setOpen(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Arama hatası')
        setResults([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(t)
    }
  }, [query])

  const addRecipient = (recipient: Recipient) => {
    const emailLower = recipient.email.toLowerCase()
    if (selectedEmails.has(emailLower)) return
    onChange([...value, recipient])
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const removeRecipient = (email: string) => {
    onChange(value.filter((v) => v.email.toLowerCase() !== email.toLowerCase()))
  }

  const handleExternalFromInput = () => {
    const trimmed = query.trim()
    if (!EMAIL_REGEX.test(trimmed)) return

    addRecipient(buildExternalRecipient(trimmed))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      const shouldHandle = e.key === 'Enter' || e.key === ','
      if (!shouldHandle) return
      e.preventDefault()
      handleExternalFromInput()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 bg-gray-900 border border-gray-700 rounded-xl p-2.5">
        {value.map((r) => (
          <RecipientBadge key={r.email} recipient={r} onRemove={() => removeRecipient(r.email)} />
        ))}

        <div className="flex-1 min-w-[160px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim().length >= 2 && results.length > 0) setOpen(true)
            }}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            className="w-full bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none"
          />
        </div>
      </div>

      {error && <div className="text-xs text-red-300">{error}</div>}

      {open && (loading || results.length > 0) && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-3 py-2 text-xs text-gray-500">
            {loading ? 'Aranıyor...' : 'Sonuçlar'}
          </div>

          {results.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              {results.map((r) => {
                const already = selectedEmails.has(r.email.toLowerCase())
                return (
                  <button
                    key={r.id + ':' + r.email}
                    type="button"
                    disabled={already}
                    onClick={() => addRecipient(toRecipientFromSearchRow(r))}
                    className="w-full text-left px-3 py-2 hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-200 font-medium">
                        {r.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.avatar} alt={r.name} className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          r.name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-white font-medium">{r.name}</div>
                        <div className="text-xs text-gray-400">{r.email} · {r.subtitle}</div>
                      </div>
                      <div className="text-xs text-gray-500">{r.type === 'member' ? 'Üye' : 'Konuşmacı'}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {EMAIL_REGEX.test(query.trim()) && (
            <button
              type="button"
              onClick={handleExternalFromInput}
              className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 border-t border-gray-700"
            >
              <div className="text-sm text-indigo-300">📧 "{query.trim()}" dış adres ekle</div>
            </button>
          )}
        </div>
      )}

      <div className="text-[11px] text-gray-600">Enter/virgül ile dış adres ekleyebilirsiniz.</div>
    </div>
  )
}

