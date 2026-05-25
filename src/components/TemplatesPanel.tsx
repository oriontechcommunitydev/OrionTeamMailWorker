// Template CRUD paneli — email_templates tablosu için liste + create/edit/delete

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, FileText, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { EmailTemplate } from '../lib/types'
import TemplateCard from './TemplateCard'
import TemplateForm from './TemplateForm'

type ActiveFilter = 'all' | 'true' | 'false'

const SYSTEM_TEMPLATE_CODES: ReadonlySet<string> = new Set([
  'welcome_member',
  'task_assigned',
  'project_member',
  'department_member',
  'area_member',
  'member_area_assigned',
  'speaker_invite',
  'event_speaker',
  'event_staff_member',
  'announcement_general',
  'announcement_member',
  'birthday_personal',
  'birthday_team',
])

export default function TemplatesPanel() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingId, setEditingId] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Vite+React (client) tarafında arama: template_name veya template_code iltelemesi için basit ilke
      // Supabase'de ILIKE ile arama yapıyoruz.
      let q = supabase.from('email_templates').select('*').order('template_name', { ascending: true })

      const trimmed = query.trim()
      if (trimmed.length > 0) {
        // OR koşulu: (template_name ilike) OR (template_code ilike)
        q = q.or(`template_name.ilike.%${trimmed}%,template_code.ilike.%${trimmed}%`)
      }

      if (activeFilter !== 'all') {
        const isActive = activeFilter === 'true'
        q = q.eq('is_active', isActive)
      }

      const { data, error: err } = await q
      if (err) throw err

      setTemplates((data as EmailTemplate[]) ?? [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Şablonlar yüklenemedi'
      setError(msg)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [activeFilter, query])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const stats = useMemo(() => {
    const total = templates.length
    const activeCount = templates.filter((t) => t.is_active).length
    return { total, activeCount, inactiveCount: total - activeCount }
  }, [templates])

  const openCreate = () => {
    setEditingId(null)
    setMode('create')
  }

  const openEdit = (id: number) => {
    setEditingId(id)
    setMode('edit')
  }

  const closeForm = () => {
    setMode('list')
    setEditingId(null)
    void refresh()
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white">Email Şablonları</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-300">{stats.total} şablon</span>
              <span className="text-xs bg-green-900/30 text-green-300 border border-green-700/50 px-2.5 py-1 rounded-full">
                {stats.activeCount} aktif
              </span>
              <span className="text-xs bg-gray-700 text-gray-400 px-2.5 py-1 rounded-full">
                {stats.inactiveCount} pasif
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Yenile"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          <button
            onClick={openCreate}
            className="px-4 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            + Yeni Şablon
          </button>
        </div>
      </div>

      <div className="p-5 border-b border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-400 whitespace-nowrap">Şablon ara</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Şablon adı veya kod..."
              className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 w-full md:w-72 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-400 whitespace-nowrap">Durum</label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
              className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="m-5 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {mode === 'list' && (
        <div className="p-5">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-800 border border-gray-700 rounded-2xl p-4 animate-pulse">
                  <div className="h-4 w-32 bg-gray-700 rounded mb-3" />
                  <div className="h-3 w-56 bg-gray-700 rounded mb-2" />
                  <div className="h-3 w-40 bg-gray-700 rounded mb-6" />
                  <div className="h-9 w-full bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="py-14 text-center text-gray-500 text-sm">Şablon bulunamadı</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  isSystemTemplate={SYSTEM_TEMPLATE_CODES.has(t.template_code)}
                  onEdit={() => openEdit(t.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {mode !== 'list' && (
        <div className="p-5">
          {mode === 'create' && <TemplateForm mode="create" onDone={closeForm} onCreated={refresh} />}
          {mode === 'edit' && editingId != null && (
            <TemplateForm
              mode="edit"
              templateId={editingId}
              onDone={closeForm}
              onUpdated={refresh}
              isSystemTemplate={SYSTEM_TEMPLATE_CODES.has(
                templates.find((x) => x.id === editingId)?.template_code ?? ''
              )}
            />
          )}
        </div>
      )}
    </div>
  )
}

