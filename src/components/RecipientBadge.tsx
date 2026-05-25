// RecipientBadge — recipient kimliğine göre badge

import { useMemo } from 'react'
import type { Recipient } from '../lib/types'

interface RecipientBadgeProps {
  recipient: Recipient
  onRemove: () => void
}

type RecipientBadgeVariant = {
  bg: string
  text: string
  label: string
}

function getVariant(recipient: Recipient): RecipientBadgeVariant {
  if (recipient.type === 'member') {
    return { bg: 'bg-blue-900', text: 'text-blue-300', label: 'Üye' }
  }

  if (recipient.type === 'speaker') {
    return { bg: 'bg-purple-900', text: 'text-purple-300', label: 'Konuşmacı' }
  }

  return { bg: 'bg-gray-700', text: 'text-gray-300', label: 'Dış' }
}

export default function RecipientBadge({ recipient, onRemove }: RecipientBadgeProps) {
  const variant = useMemo(() => getVariant(recipient), [recipient])

  const badgeText = recipient.type === 'external' ? recipient.email : `${recipient.name} ${recipient.email}`

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg ${variant.bg} ${variant.text} border border-white/10`}
      title={recipient.email}
    >
      <span className="text-xs font-medium whitespace-nowrap">
        {recipient.type === 'external' ? recipient.email : recipient.name}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-current hover:opacity-90 transition-opacity"
        aria-label="Alıcıyı kaldır"
      >
        ×
      </button>
      <span className="hidden sm:inline text-[10px] opacity-70">{variant.label}</span>
      <span className="sr-only">{badgeText}</span>
    </div>
  )
}

