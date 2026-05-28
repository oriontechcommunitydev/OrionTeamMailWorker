// Mail kuyruğu tablosu — filtreleme, sayfalama, otomatik yenileme

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { EmailQueueItem, StatusFilter } from '../lib/types'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'
import { ChevronLeft, ChevronRight, RefreshCw, Loader2, Inbox, AlertTriangle, Send, Check, Trash2 } from 'lucide-react'

interface QueueTableProps {
  refreshTrigger?: number
}

const PAGE_LIMIT = 20

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.substring(0, max) + '…' : str
}

export default function QueueTable({ refreshTrigger }: QueueTableProps) {
  const [items, setItems] = useState<EmailQueueItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<number | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async (p: number, status: StatusFilter) => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('email_queue')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((p - 1) * PAGE_LIMIT, p * PAGE_LIMIT - 1)

      if (status !== 'all') {
        query = query.eq('status', status)
      }

      const { data, count, error: qErr } = await query

      if (qErr) throw new Error(qErr.message)

      setItems((data as EmailQueueItem[]) ?? [])
      setTotal(count ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri alınamadı')
    } finally {
      setLoading(false)
    }
  }, [])

  // Mail gönderme fonksiyonu
  const handleSendEmail = async (queueId: number) => {
    setSendingId(queueId)
    setSendError(null)

    try {
      const response = await fetch(`/api/queue/${queueId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Mail gönderilemedi')
      }

      console.log('[QueueTable] Mail gönderildi:', data)

      // Listesini yenile
      await fetchData(page, statusFilter)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Bilinmeyen hata'
      setSendError(errorMsg)
      console.error('[QueueTable] Gönderim hatası:', errorMsg)
    } finally {
      setSendingId(null)
    }
  }

  // Mail silme fonksiyonu
  const handleDeleteQueue = async (queueId: number) => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/queue/${queueId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Mail silinemedi')
      }

      console.log('[QueueTable] Mail silindi:', data)

      // Listesini yenile
      await fetchData(page, statusFilter)
      setDeleteConfirmId(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Bilinmeyen hata'
      setSendError(errorMsg)
      console.error('[QueueTable] Silme hatası:', errorMsg)
    } finally {
      setDeleting(false)
    }
  }

  // İlk yükleme ve filtre/sayfa değişikliği
  useEffect(() => {
    void fetchData(page, statusFilter)
  }, [page, statusFilter, fetchData, refreshTrigger])

  // Her 30 saniyede otomatik yenile
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void fetchData(page, statusFilter)
    }, 30_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [page, statusFilter, fetchData])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  const handleFilterChange = (f: StatusFilter) => {
    setStatusFilter(f)
    setPage(1)
  }

  const filterTabs: { key: StatusFilter; label: string; color: string }[] = [
    { key: 'all', label: 'Tümü', color: 'text-gray-300' },
    { key: 'pending', label: '⏳ Bekleyen', color: 'text-yellow-300' },
    { key: 'sent', label: '✅ Gönderilen', color: 'text-emerald-300' },
    { key: 'failed', label: '❌ Başarısız', color: 'text-red-300' },
  ]

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Başlık + Filtreler */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-white">Mail Kuyruğu</h2>
          <span className="text-xs bg-gray-700 text-gray-400 px-2.5 py-1 rounded-full">
            {total.toLocaleString('tr-TR')} kayıt
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtre sekmeleri */}
          <div className="flex items-center bg-gray-900 rounded-xl p-1 gap-0.5">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === tab.key
                    ? 'bg-gray-700 text-white shadow'
                    : `${tab.color} hover:bg-gray-800`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Manuel yenile */}
          <button
            onClick={() => fetchData(page, statusFilter)}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Yenile"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Hata durumu */}
      {error && (
        <div className="flex items-center gap-2 m-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Gönderim hatası durumu */}
      {sendError && (
        <div className="flex items-center gap-2 m-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {sendError}
        </div>
      )}

      {/* Tablo */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-900/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-16">ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Alıcı Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">İsim</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Template</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Öncelik</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Deneme</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Tarih</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {loading && items.length === 0 ? (
              // Skeleton satırlar
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3.5"><div className="w-8 h-4 bg-gray-700 rounded" /></td>
                  <td className="px-4 py-3.5"><div className="w-36 h-4 bg-gray-700 rounded" /></td>
                  <td className="px-4 py-3.5 hidden md:table-cell"><div className="w-24 h-4 bg-gray-700 rounded" /></td>
                  <td className="px-4 py-3.5"><div className="w-28 h-4 bg-gray-700 rounded" /></td>
                  <td className="px-4 py-3.5 hidden lg:table-cell"><div className="w-16 h-5 bg-gray-700 rounded-full" /></td>
                  <td className="px-4 py-3.5"><div className="w-20 h-5 bg-gray-700 rounded-full" /></td>
                  <td className="px-4 py-3.5 hidden sm:table-cell"><div className="w-8 h-4 bg-gray-700 rounded" /></td>
                  <td className="px-4 py-3.5 hidden xl:table-cell"><div className="w-32 h-4 bg-gray-700 rounded" /></td>
                  <td className="px-4 py-3.5"><div className="w-16 h-8 bg-gray-700 rounded" /></td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-500">
                    <Inbox className="w-10 h-10 opacity-40" />
                    <p className="text-sm">
                      {statusFilter === 'all' ? 'Kuyruk boş' : `'${statusFilter}' durumunda mail yok`}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-700/30 transition-colors ${
                    item.status === 'failed' ? 'bg-red-500/5' : ''
                  }`}
                >
                  <td className="px-4 py-3.5 text-gray-500 font-mono text-xs">
                    #{item.id}
                  </td>
                  <td className="px-4 py-3.5 text-gray-200 font-medium">
                    {truncate(item.recipient_email, 30)}
                  </td>
                  <td className="px-4 py-3.5 text-gray-400 hidden md:table-cell">
                    {item.recipient_name ? truncate(item.recipient_name, 20) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-lg">
                      {item.template_code}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <PriorityBadge priority={item.priority} />
                  </td>
                  <td className="px-4 py-3.5">
                    {/* Hatalı satırlarda tooltip ile hata mesajı */}
                    {item.status === 'failed' && item.error_message ? (
                      <div className="group relative inline-flex">
                        <StatusBadge status={item.status} />
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 w-64">
                          <div className="bg-gray-900 border border-red-500/30 rounded-lg p-2.5 text-xs text-red-300 shadow-xl">
                            <p className="font-semibold mb-1 text-red-400">Hata Detayı:</p>
                            <p className="leading-relaxed break-words">{item.error_message}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <StatusBadge status={item.status} />
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                    <span className={`text-sm font-medium ${
                      item.attempt_count > 0 ? 'text-orange-400' : 'text-gray-500'
                    }`}>
                      {item.attempt_count}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs hidden xl:table-cell whitespace-nowrap">
                    {formatDate(item.created_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {item.status === 'pending' ? (
                        <button
                          onClick={() => handleSendEmail(item.id)}
                          disabled={sendingId === item.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Bu maili hemen gönder"
                        >
                          {sendingId === item.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Gönderiliyor...
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              Gönder
                            </>
                          )}
                        </button>
                      ) : item.status === 'sent' ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 text-gray-400 text-xs font-medium">
                          <Check className="w-3.5 h-3.5" />
                          Gönderilen
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">—</div>
                      )}
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        disabled={deleting}
                        className="p-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-700">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Önceki
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              <span className="text-white font-medium">{page}</span>
              <span className="mx-1">/</span>
              <span>{totalPages}</span>
            </span>
            <span className="text-xs text-gray-600 hidden sm:inline">
              ({total.toLocaleString('tr-TR')} kayıt)
            </span>
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Sonraki
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Otomatik yenileme bilgisi */}
      <div className="px-5 py-2 border-t border-gray-700/50 bg-gray-900/30">
        <p className="text-xs text-gray-600">
          ⏱️ Her 30 saniyede otomatik yenilenir
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Maili Sil</h3>
                  <p className="text-xs text-gray-400 mt-1">Bu işlem geri alınamaz</p>
                </div>
              </div>

              <p className="text-sm text-gray-300">
                Bu maili kuyruktan kalıcı olarak silmek istediğinize emin misiniz?
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteQueue(deleteConfirmId)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Siliniyor...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Sil
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
