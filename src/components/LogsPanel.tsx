// Son gönderim logları paneli — email_send_logs tablosunu gösterir

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Activity, CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react'

interface LogEntry {
  id: number
  queue_id: number
  recipient_email: string
  template_code: string
  event_type: string
  event_data: Record<string, unknown>
  created_at: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function LogsPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchLogs() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('email_send_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (err) setError(err.message)
    else setLogs((data as LogEntry[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void fetchLogs()
  }, [])

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500/20 text-green-400 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <h2 className="text-base font-semibold text-white">Gönderim Logları</h2>
          <span className="text-xs bg-gray-700 text-gray-400 px-2.5 py-1 rounded-full">
            Son 50 kayıt
          </span>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </button>
      </div>

      {error && (
        <div className="m-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="divide-y divide-gray-700/50 max-h-96 overflow-y-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3 animate-pulse">
              <div className="w-4 h-4 bg-gray-700 rounded-full shrink-0" />
              <div className="flex-1">
                <div className="w-40 h-3.5 bg-gray-700 rounded mb-1.5" />
                <div className="w-24 h-3 bg-gray-700 rounded" />
              </div>
              <div className="w-28 h-3 bg-gray-700 rounded" />
            </div>
          ))
        ) : logs.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-500 text-sm">
            Henüz log kaydı yok
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-700/20 transition-colors">
              <div className="mt-0.5 shrink-0">
                {log.event_type === 'sent' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-200 truncate">{log.recipient_email}</span>
                  <span className="font-mono text-xs text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                    {log.template_code}
                  </span>
                </div>
                {log.event_type === 'failed' && log.event_data['error'] != null && (
                  <p className="text-xs text-red-400 mt-0.5 truncate">
                    {String(log.event_data['error'])}
                  </p>
                )}
                {log.event_type === 'sent' && log.event_data['messageId'] != null && (
                  <p className="text-xs text-gray-600 mt-0.5 font-mono truncate">
                    ID: {String(log.event_data['messageId'])}
                  </p>
                )}
              </div>

              <span className="text-xs text-gray-600 whitespace-nowrap shrink-0">
                {formatDate(log.created_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
