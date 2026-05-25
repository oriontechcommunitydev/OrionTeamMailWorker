// Kuyruğu manuel tetikleme butonu

import { useState } from 'react'
import { Rocket, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { processEmailQueue } from '../lib/worker'
import { WorkerResult } from '../lib/types'

interface TriggerButtonProps {
  onComplete?: () => void
}

type ButtonState = 'idle' | 'loading' | 'success' | 'error'

export default function TriggerButton({ onComplete }: TriggerButtonProps) {
  const [state, setState] = useState<ButtonState>('idle')
  const [result, setResult] = useState<WorkerResult | null>(null)

  const handleClick = async () => {
    if (state === 'loading') return
    setState('loading')
    setResult(null)

    try {
      const res = await processEmailQueue()
      setResult(res)
      setState('success')
      // Tabloyu yenile
      onComplete?.()
      // 4 saniye sonra idle'a dön
      setTimeout(() => setState('idle'), 4000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      setResult({ success: false, sent: 0, failed: 0, skipped: 0, message })
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  const buttonConfig = {
    idle: {
      icon: <Rocket className="w-4 h-4" />,
      label: 'Kuyruğu Çalıştır',
      className: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    },
    loading: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      label: 'İşleniyor...',
      className: 'bg-indigo-700 text-indigo-200 cursor-not-allowed',
    },
    success: {
      icon: <CheckCircle className="w-4 h-4" />,
      label: result ? `${result.sent} mail gönderildi` : 'Tamamlandı',
      className: 'bg-emerald-600 text-white',
    },
    error: {
      icon: <AlertCircle className="w-4 h-4" />,
      label: 'Hata oluştu',
      className: 'bg-red-600 text-white',
    },
  }

  const config = buttonConfig[state]

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg ${config.className}`}
      >
        {config.icon}
        {config.label}
      </button>

      {/* Toast bildirim */}
      {(state === 'success' || state === 'error') && result && (
        <div
          className={`text-xs px-3 py-1.5 rounded-lg max-w-xs text-right ${
            state === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}
        >
          {result.message}
          {state === 'success' && result.failed > 0 && (
            <span className="text-red-400 ml-1">({result.failed} hatalı)</span>
          )}
        </div>
      )}
    </div>
  )
}
