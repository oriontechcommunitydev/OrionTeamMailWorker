'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function DeleteTemplateButton({
  templateId,
  templateName,
  isSystemTemplate,
}: {
  templateId: number
  templateCode: string
  templateName: string
  isSystemTemplate: boolean
}) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (isSystemTemplate) return

    const ok = window.confirm(
      `🗑 ${templateName} şablonunu silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
    )
    if (!ok) return

    setLoading(true)
    try {
      const { error } = await supabase.from('email_templates').delete().eq('id', templateId)
      if (error) throw error
      // Silme sonrası UI refresh'i üst component yapar.
      window.location.reload()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Şablon silinemedi'
      window.alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      disabled={isSystemTemplate || loading}
      title={isSystemTemplate ? 'Sistem şablonu silinemez, sadece deaktif edebilirsiniz' : 'Sil'}
      className={`w-9 h-9 rounded-xl border border-gray-600 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isSystemTemplate ? 'bg-gray-700 text-gray-500' : 'bg-red-600/90 hover:bg-red-700 text-white'
      }`}
      onClick={(e) => {
        e.stopPropagation()
        void handleDelete()
      }}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}


