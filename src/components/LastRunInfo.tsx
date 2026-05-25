// Son çalışma zamanı ve günlük istatistik bilgisi

import { DashboardStats } from '../lib/types'
import { Clock, TrendingUp } from 'lucide-react'

interface LastRunInfoProps {
  stats: DashboardStats | null
  loading: boolean
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Henüz çalışmadı'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Az önce'
  if (mins < 60) return `${mins} dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} sa önce`
  return `${Math.floor(hours / 24)} gün önce`
}

export default function LastRunInfo({ stats, loading }: LastRunInfoProps) {
  if (loading || !stats) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-48 h-4 bg-gray-700 rounded" />
          <div className="w-40 h-4 bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2.5 text-sm">
          <div className="w-7 h-7 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <span className="text-gray-400">Bugün gönderilen:</span>
          <span className="text-white font-semibold">
            {stats.sent_today.toLocaleString('tr-TR')}
          </span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-300">
            {stats.daily_limit.toLocaleString('tr-TR')}
          </span>
          <span className="text-gray-500">günlük limit</span>
        </div>

        <div className="w-px h-4 bg-gray-700 hidden sm:block" />

        <div className="flex items-center gap-2.5 text-sm">
          <div className="w-7 h-7 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <span className="text-gray-400">Son çalışma:</span>
          <span className="text-white font-medium">
            {timeAgo(stats.last_run_at)}
          </span>
          {stats.last_run_at && (
            <span className="text-gray-600 text-xs">
              ({new Date(stats.last_run_at).toLocaleString('tr-TR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })})
            </span>
          )}
        </div>

        {/* Cron bilgisi */}
        <div className="ml-auto hidden lg:flex items-center gap-1.5 text-xs text-gray-600">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Her 5 dakikada otomatik çalışır
        </div>
      </div>
    </div>
  )
}
