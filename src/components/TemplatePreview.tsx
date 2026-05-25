'use client'

import { useMemo, useState } from 'react'
import { Eye, Code, Maximize2 } from 'lucide-react'

const EXAMPLE_PARAMS: Record<string, string> = {
  member_name: 'Ahmet Yılmaz',
  join_date: '15.01.2024',
  task_name: 'Örnek Görev',
  deadline: '30.01.2024',
  project_name: 'Örnek Proje',
  department_name: 'Yazılım Bölümü',
  area_name: 'Backend Alanı',
  speaker_name: 'Dr. Ayşe Kaya',
  speaker_title: 'Senior Developer',
  speaker_company: 'Tech Corp',
  event_name: 'Tech Summit 2024',
  event_date: '20.01.2024 10:00',
  event_location: 'İstanbul',
  announcement_title: 'Örnek Duyuru Başlığı',
  announcement_description: 'Duyuru içeriği buraya gelir.',
  announcement_body: 'Kişisel duyuru içeriği.',
  birthday_person: 'Mehmet Demir',
}

function renderVars(html: string) {
  return html.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    return Object.prototype.hasOwnProperty.call(EXAMPLE_PARAMS, key) ? EXAMPLE_PARAMS[key] : ''
  })
}

export default function TemplatePreview({
  htmlContent,
}: {
  htmlContent: string
}) {
  const [tab, setTab] = useState<'preview' | 'raw'>('preview')
  const [open, setOpen] = useState(false)

  const rendered = useMemo(() => renderVars(htmlContent), [htmlContent])

  const content = (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            tab === 'preview'
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" /> Önizleme
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('raw')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            tab === 'raw'
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Code className="w-3.5 h-3.5" /> Ham HTML
          </span>
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-600 bg-gray-700 hover:bg-gray-600 text-white transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" /> Tam ekran
        </button>
      </div>

      {tab === 'preview' ? (
        <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-950">
          <iframe
            title="template-preview"
            className="w-full min-h-[260px]"
            sandbox="allow-same-origin"
            srcDoc={rendered}
          />
        </div>
      ) : (
        <div className="border border-gray-700 rounded-xl bg-gray-950 p-3">
          <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words font-mono">{htmlContent}</pre>
        </div>
      )}
    </div>
  )

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">HTML Önizleme</h3>
        <span className="text-xs text-gray-400">{tab === 'preview' ? 'Render' : 'Ham'}</span>
      </div>
      {content}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Önizleme</div>
                <div className="text-xs text-gray-400">Gerçek zamanlı render</div>
              </div>
              <button
                type="button"
                className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="p-4">{content}</div>
          </div>
        </div>
      )}
    </div>
  )
}

