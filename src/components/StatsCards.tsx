// İstatistik kartları — Özet metrikler

import { DashboardStats } from '../lib/types'
import { Clock, CheckCircle2, XCircle, Send } from 'lucide-react'

interface StatsCardsProps {
  stats: DashboardStats | null
  loading: boolean
}

function formatNumber(n: number): string {
  return n.toLocaleString('tr-TR')
}

function SkeletonCard() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-gray-700 rounded-xl" />
        <div className="w-16 h-5 bg-gray-700 rounded" />
      </div>
      <div className="w-20 h-8 bg-gray-700 rounded mb-2" />
      <div className="w-24 h-4 bg-gray-700 rounded" />
    </div>
  )
}

export default function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  const limitPercent = stats.daily_limit > 0
    ? Math.min(100, Math.round((stats.sent_today / stats.daily_limit) * 100))
    : 0

  const cards = [
    {
      icon: <Clock className="w-5 h-5" />,
      iconBg: 'bg-yellow-500/20',
      iconColor: 'text-yellow-400',
      value: formatNumber(stats.total_pending),
      label: 'Bekleyen',
      sublabel: 'Pending',
      borderColor: 'border-yellow-500/30',
      accent: 'text-yellow-300',
    },
    {
      icon: <CheckCircle2 className="w-5 h-5" />,
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
      value: formatNumber(stats.total_sent),
      label: 'Gönderilen',
      sublabel: 'Toplam',
      borderColor: 'border-emerald-500/30',
      accent: 'text-emerald-300',
    },
    {
      icon: <XCircle className="w-5 h-5" />,
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-400',
      value: formatNumber(stats.total_failed),
      label: 'Başarısız',
      sublabel: 'Failed',
      borderColor: 'border-red-500/30',
      accent: 'text-red-300',
    },
    {
      icon: <Send className="w-5 h-5" />,
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      value: formatNumber(stats.sent_today),
      label: 'Bugün',
      sublabel: `/ ${formatNumber(stats.daily_limit)} günlük limit`,
      borderColor: 'border-blue-500/30',
      accent: 'text-blue-300',
      extra: (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Kullanım</span>
            <span>{limitPercent}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                limitPercent >= 90 ? 'bg-red-500' :
                limitPercent >= 70 ? 'bg-yellow-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${limitPercent}%` }}
            />
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className={`bg-gray-800 border ${card.borderColor} rounded-2xl p-5 hover:bg-gray-750 transition-colors`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 ${card.iconBg} ${card.iconColor} rounded-xl flex items-center justify-center`}>
              {card.icon}
            </div>
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              {card.sublabel}
            </span>
          </div>
          <div className={`text-3xl font-bold ${card.accent} mb-1`}>
            {card.value}
          </div>
          <div className="text-sm text-gray-400">
            {card.label}
          </div>
          {card.extra}
        </div>
      ))}
    </div>
  )
}
