'use client'

import { useMemo } from 'react'
import { ClipboardCheck } from 'lucide-react'

const PLACEHOLDER_MAP: Record<string, string[]> = {
  welcome_member: ['{{member_name}}', '{{join_date}}'],
  task_assigned: ['{{member_name}}', '{{task_name}}', '{{deadline}}'],
  project_member: ['{{member_name}}', '{{project_name}}'],
  department_member: ['{{member_name}}', '{{department_name}}'],
  area_member: ['{{member_name}}', '{{area_name}}'],
  member_area_assigned: ['{{member_name}}', '{{area_name}}'],
  speaker_invite: ['{{speaker_name}}', '{{speaker_title}}', '{{speaker_company}}'],
  event_speaker: ['{{speaker_name}}', '{{event_name}}', '{{event_date}}', '{{event_location}}'],
  event_staff_member: ['{{member_name}}', '{{event_name}}', '{{event_date}}', '{{event_location}}'],
  announcement_general: ['{{member_name}}', '{{announcement_title}}', '{{announcement_description}}'],
  announcement_member: ['{{member_name}}', '{{announcement_title}}', '{{announcement_body}}'],
  birthday_personal: ['{{member_name}}'],
  birthday_team: ['{{birthday_person}}'],
  other: [
  '{{member_name}}',
  '{{subject}}',
  '{{title}}',
  '{{message}}'
],
}

export default function PlaceholderHelper({
  templateCode,
  onInsert,
}: {
  templateCode?: string
  onInsert: (placeholder: string) => void
}) {
  const placeholders = useMemo(() => {
    if (!templateCode) return []
    return PLACEHOLDER_MAP[templateCode] ?? []
  }, [templateCode])

  return (
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardCheck className="w-4 h-4 text-indigo-300" />
        <h3 className="text-sm font-semibold text-white">📋 Kullanılabilir Değişkenler</h3>
      </div>
      {placeholders.length === 0 ? (
        <div className="text-xs text-gray-500">Önce şablon kodu seçin.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {placeholders.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onInsert(p)
                window.setTimeout(() => {
                  window.alert('Kopyalandı!')
                }, 0)
              }}
              className="text-xs font-mono px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-200 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

