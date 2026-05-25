// MailHistoryTable — gönderim geçmişi tablosu

'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ManualEmail } from '../lib/types'
import { ChevronLeft, ChevronRight, Loader2, Eye, X } from 'lucide-react'

const PAGE_LIMIT = 20

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadge(status: ManualEmail['status']): { bg: string; text: string; label: string } {
  if (status === 'sent') return { bg: 'bg-green-900', text: 'text-green-300', label: '✅ Gönderildi' }
  if (status === 'failed') return { bg: 'bg-red-900', text: 'text-red-300', label: '❌ Başarısız' }
  return { bg: 'bg-yellow-900', text: 'text-yellow-300', label: '⏳ Bekliyor' }
}

export default function MailHistoryTable() {
  const [data, setData] = useState<ManualEmail[]>([])
  const [total, setTotal] = useState<number>(0)
  const [page, setPage] = useState<number>(1)
  const [limit] = useState<number>(PAGE_LIMIT)
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedMail, setSelectedMail] = useState<ManualEmail | null>(null)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [limit, total])

  const fetchData = async (p: number) => {
    setLoading(true)
    try {
      const resp = await fetch(`/api/compose/history?page=${p}&limit=${limit}`)
      if (!resp.ok) throw new Error('Geçmiş yüklenemedi')
      const json = (await resp.json()) as { data: ManualEmail[]; total: number; page: number; limit: number }
      setData(json.data ?? [])
      setTotal(json.total ?? 0)
      setPage(json.page ?? p)
    } catch {
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData(page)
  }, [page])

  useEffect(() => {
    const t = window.setInterval(() => {
      void fetchData(page)
    }, 60_000)

    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const maxToShow = 2
  const maxCcShow = 1

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-700">
        <div>
          <h2 className="text-base font-semibold text-white">Gönderim Geçmişi</h2>
          <div className="text-xs text-gray-400">Manuel gönderilen mailler</div>
        </div>
        <div className="text-xs text-gray-400">
          {total.toLocaleString('tr-TR')} kayıt
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-900/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Konu</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Alıcılar</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">CC</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-700/50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3.5"><div className="w-28 h-4 bg-gray-700 rounded" /></td>
                  <td className="px-4 py-3.5"><div className="w-48 h-4 bg-gray-700 rounded" /></td>
                  <td className="px-4 py-3.5"><div className="w-56 h-4 bg-gray-700 rounded" /></td>
                  <td className="px-4 py-3.5 hidden md:table-cell"><div className="w-36 h-4 bg-gray-700 rounded" /></td>
                  <td className="px-4 py-3.5"><div className="w-24 h-5 bg-gray-700 rounded" /></td>
                  <td className="px-4 py-3.5"><div className="w-16 h-6 bg-gray-700 rounded" /></td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Loader2 className="w-6 h-6 opacity-40 animate-spin" />
                    <div className="text-sm">Henüz kayıt yok</div>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((m) => {
                const sb = statusBadge(m.status)
                return (
                  <tr key={m.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">{formatDate(m.created_at)}</td>
                    <td className="px-4 py-3.5 text-gray-200">{m.subject}</td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        {m.to_emails.slice(0, maxToShow).map((t) => (
                          <div key={t.email} className="text-xs text-gray-200 font-mono">{t.email}</div>
                        ))}
                        {m.to_emails.length > maxToShow && (
                          <div className="text-xs text-gray-400">+{m.to_emails.length - maxToShow} daha</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {m.cc_emails.length > 0 ? (
                        <div className="space-y-1">
                          {m.cc_emails.slice(0, maxCcShow).map((c) => (
                            <div key={c.email} className="text-xs text-gray-200 font-mono">{c.email}</div>
                          ))}
                          {m.cc_emails.length > maxCcShow && (
                            <div className="text-xs text-gray-400">+{m.cc_emails.length - maxCcShow} daha</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${sb.bg} ${sb.text}`}>
                        {sb.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => setSelectedMail(m)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-900 border border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white"
                      >
                        👁 Detay
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-700">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Önceki
          </button>
          <div className="text-sm text-gray-400">
            <span className="text-white font-medium">{page}</span> / {totalPages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Sonraki <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {selectedMail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-5xl bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">📧 Mail Detayı</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMail(null)}
                className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
                  <div className="text-xs text-gray-400">Konu</div>
                  <div className="text-sm text-white font-medium">{selectedMail.subject}</div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
                  <div className="text-xs text-gray-400">Tarih</div>
                  <div className="text-sm text-gray-200">{formatDate(selectedMail.created_at)}</div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
                  <div className="text-xs text-gray-400">Durum</div>
                  {(() => {
                    const sb = statusBadge(selectedMail.status)
                    return (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${sb.bg} ${sb.text}`}>
                        {sb.label}
                      </span>
                    )
                  })()}
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
                <div className="text-xs text-gray-400">Alıcılar</div>
                <div className="mt-2 space-y-1">
                  {selectedMail.to_emails.map((t) => (
                    <div key={t.email} className="text-xs text-gray-200 font-mono">{t.email}</div>
                  ))}
                </div>

                {selectedMail.cc_emails.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-400">CC</div>
                    <div className="mt-2 space-y-1">
                      {selectedMail.cc_emails.map((c) => (
                        <div key={c.email} className="text-xs text-gray-200 font-mono">{c.email}</div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedMail.error_message && (
                  <div className="mt-3">
                    <div className="text-xs text-red-300">Hata</div>
                    <div className="mt-1 text-xs text-red-200 break-words">{selectedMail.error_message}</div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-400">— HTML Önizleme —</div>
                <iframe
                  title="Mail detay önizleme"
                  sandbox="allow-same-origin"
                  className="w-full min-h-[420px] bg-white rounded-xl border border-gray-200"
                  srcDoc={selectedMail.html_content}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

