import { useMemo } from 'react'
import { CheckCircle, XCircle, Hash, Lock, Pencil, Eye } from 'lucide-react'
import type { EmailTemplate } from '../lib/types'
import DeleteTemplateButton from './DeleteTemplateButton'

export default function TemplateCard({
  template,
  isSystemTemplate,
  onEdit,
}: {
  template: EmailTemplate
  isSystemTemplate: boolean
  onEdit: () => void
}) {
  const statusBadge = useMemo(() => {
    if (template.is_active) {
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        className: 'text-emerald-400',
      }
    }

    return {
      icon: <XCircle className="w-4 h-4" />,
      className: 'text-gray-600',
    }
  }, [template.is_active])

  return (
    <div
      className="bg-gray-800 border border-gray-700 rounded-2xl p-4 hover:bg-gray-800/70 transition-colors"
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onEdit()
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-900/40 border border-gray-700 ${
              statusBadge.className
            }`}
          >
            {statusBadge.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-white truncate">{template.template_name}</span>
              {isSystemTemplate && (
                <span
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300 border border-blue-700"
                  title="Sistem şablonu"
                >
                  <Lock className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-400">Konu: <span className="text-gray-300">{template.subject}</span></div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {template.brevo_template_id ? (
            <div className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded-lg shrink-0">
              <Hash className="w-3 h-3" />
              {template.brevo_template_id}
            </div>
          ) : (
            <div className="text-xs text-gray-500">Brevo ID: —</div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="w-9 h-9 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 flex items-center justify-center transition-colors disabled:opacity-50"
              title="Görüntüle (düzenleme sayfası aynı form)"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Eye className="w-4 h-4" />
            </button>

            <button
              type="button"
              className="w-9 h-9 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 flex items-center justify-center transition-colors"
              title="Düzenle"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Pencil className="w-4 h-4" />
            </button>

            <DeleteTemplateButton
              templateId={template.id}
              templateCode={template.template_code}
              templateName={template.template_name}
              isSystemTemplate={isSystemTemplate}
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs text-gray-400">Kod:</div>
        <div className="mt-1 font-mono text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-lg break-all">
          {template.template_code}
        </div>
      </div>
    </div>
  )
}

