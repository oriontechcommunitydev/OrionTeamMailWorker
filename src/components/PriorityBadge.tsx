// Öncelik badge bileşeni — low / medium / high

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high'
}

const priorityConfig = {
  high: {
    label: '🔴 Yüksek',
    className: 'bg-red-500/20 text-red-300 border border-red-500/40',
  },
  medium: {
    label: '🟡 Orta',
    className: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  },
  low: {
    label: '⚪ Düşük',
    className: 'bg-gray-500/20 text-gray-400 border border-gray-500/40',
  },
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = priorityConfig[priority]

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${config.className}`}
    >
      {config.label}
    </span>
  )
}
