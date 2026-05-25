// Durum badge bileşeni — pending / sent / failed

interface StatusBadgeProps {
  status: 'pending' | 'sent' | 'failed'
}

const statusConfig = {
  pending: {
    label: '⏳ Bekliyor',
    className: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  },
  sent: {
    label: '✅ Gönderildi',
    className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
  },
  failed: {
    label: '❌ Başarısız',
    className: 'bg-red-500/20 text-red-300 border border-red-500/40',
  },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${config.className}`}
    >
      {config.label}
    </span>
  )
}
