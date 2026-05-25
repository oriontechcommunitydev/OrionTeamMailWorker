'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Loader2, Save, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { EmailTemplate } from '../lib/types'
import PlaceholderHelper from './PlaceholderHelper'
import TemplatePreview from './TemplatePreview'

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

export default function TemplateForm({
  mode,
  templateId,
  onDone,
  onCreated,
  onUpdated,
  initialData,
  isSystemTemplate,
}: {
  mode: 'create' | 'edit'
  templateId?: number
  onDone: () => void
  onCreated?: () => void
  onUpdated?: () => void
  initialData?: EmailTemplate
  isSystemTemplate?: boolean
}) {
  const [templateName, setTemplateName] = useState(initialData?.template_name ?? '')
  const [templateCode, setTemplateCode] = useState(initialData?.template_code ?? '')
  const [brevoTemplateId, setBrevoTemplateId] = useState<string>(initialData?.brevo_template_id?.toString() ?? '')
  const [subject, setSubject] = useState(initialData?.subject ?? '')
  const [htmlContent, setHtmlContent] = useState(initialData?.html_content ?? '')
  const [isActive, setIsActive] = useState<boolean>(initialData?.is_active ?? true)

  const [fetching, setFetching] = useState(mode === 'edit')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const [originalSnapshot, setOriginalSnapshot] = useState<string>('')

  const selectedCodeForPlaceholders = useMemo(() => {
    if (mode === 'edit') return templateCode
    return templateCode || undefined
  }, [mode, templateCode])

  useEffect(() => {
    if (mode !== 'edit') {
      const snap = JSON.stringify({ templateName, templateCode, brevoTemplateId, subject, htmlContent, isActive })
      setOriginalSnapshot(snap)
      return
    }

    if (templateId == null) return

    const load = async () => {
      setFetching(true)
      setError(null)
      try {
        const { data, error: err } = await supabase.from('email_templates').select('*').eq('id', templateId).single()
        if (err) throw err
        const t = data as EmailTemplate
        setTemplateName(t.template_name)
        setTemplateCode(t.template_code)
        setBrevoTemplateId(t.brevo_template_id?.toString() ?? '')
        setSubject(t.subject)
        setHtmlContent(t.html_content)
        setIsActive(t.is_active)
        setSuccess(null)
        const snap = JSON.stringify({
          templateName: t.template_name,
          templateCode: t.template_code,
          brevoTemplateId: t.brevo_template_id?.toString() ?? '',
          subject: t.subject,
          htmlContent: t.html_content,
          isActive: t.is_active,
        })
        setOriginalSnapshot(snap)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Template yüklenemedi'
        setError(msg)
      } finally {
        setFetching(false)
      }
    }

    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, templateId])

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({ templateName, templateCode, brevoTemplateId, subject, htmlContent, isActive })
  }, [templateName, templateCode, brevoTemplateId, subject, htmlContent, isActive])

  const dirty = originalSnapshot !== '' && currentSnapshot !== originalSnapshot

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const isSystem = mode === 'edit' ? Boolean(isSystemTemplate ?? SYSTEM_TEMPLATE_CODES.has(templateCode)) : false

  const codeRegex = /^[A-Za-z0-9_]+$/

  const validation = useMemo(() => {
    const nameOk = templateName.trim().length > 0 && templateName.trim().length <= 100
    const codeOk = mode === 'edit'
      ? true
      : templateCode.trim().length > 0 && templateCode.trim().length <= 50 && codeRegex.test(templateCode.trim())
    const subjectOk = subject.trim().length > 0 && subject.trim().length <= 200
    const htmlOk = htmlContent.trim().length > 0

    return {
      nameOk,
      codeOk,
      subjectOk,
      htmlOk,
      formOk: nameOk && subjectOk && htmlOk && codeOk,
    }
  }, [codeRegex, htmlContent, mode, subject, templateCode, templateName])

  const insertPlaceholder = (placeholder: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = el.value.slice(0, start) + placeholder + el.value.slice(end)
    setHtmlContent(next)
    window.setTimeout(() => {
      el.focus()
      const cursor = start + placeholder.length
      el.setSelectionRange(cursor, cursor)
    }, 0)
  }

  const handleSubmit = async () => {
    setError(null)
    setSuccess(null)

    if (!validation.formOk) {
      setError('Lütfen zorunlu alanları doğru şekilde doldurun.')
      return
    }

    if (!dirty && mode === 'edit') {
      window.alert('Değişiklik yok')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'create') {
        const normalizedTemplateCode = templateCode.trim()
        const normalizedBrevo = brevoTemplateId.trim()
        const brevoId = normalizedBrevo.length === 0 ? null : Number(normalizedBrevo)

        // DB unique kontrolü UI öncesi kontrol: yine de son kontrol API/DB tarafında olmalı.
        const { error: existsErr, data: existsData } = await supabase
          .from('email_templates')
          .select('id')
          .eq('template_code', normalizedTemplateCode)
          .maybeSingle()

        if (existsErr) throw existsErr
        if (existsData) {
          throw new Error("Bu template_code zaten kullanımda")
        }

        const { error: err } = await supabase.from('email_templates').insert({
          template_name: templateName.trim(),
          template_code: normalizedTemplateCode,
          brevo_template_id: brevoId,
          subject: subject.trim(),
          html_content: htmlContent,
          is_active: isActive,
        })

        if (err) throw err

        setSuccess('Şablon oluşturuldu')

        setTimeout(() => {
          onCreated?.()
          onDone()
        }, 250)

        return
      }

      if (mode === 'edit' && templateId != null) {
        // template_code güncellenemez: gönderilen body’de hiç kullanmıyoruz.
        const normalizedBrevo = brevoTemplateId.trim()
        const brevoId = normalizedBrevo.length === 0 ? null : Number(normalizedBrevo)

        const { error: err } = await supabase.from('email_templates').update({
          template_name: templateName.trim(),
          brevo_template_id: brevoId,
          subject: subject.trim(),
          html_content: htmlContent,
          is_active: isActive,
        }).eq('id', templateId)

        if (err) throw err

        setSuccess('Şablon güncellendi')
        setTimeout(() => {
          onUpdated?.()
          onDone()
        }, 250)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kaydetme başarısız'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => {
            if (dirty) {
              const ok = window.confirm('Kaydedilmemiş değişiklikler var, çıkmak istiyor musunuz?')
              if (!ok) return
            }
            onDone()
          }}
          className="w-9 h-9 rounded-xl bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 flex items-center justify-center"
          title="Geri"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div>
          <h2 className="text-base font-semibold text-white">
            {mode === 'create' ? 'Yeni Email Şablonu' : `Şablonu Düzenle: ${templateName || '—'}`}
          </h2>
          <p className="text-xs text-gray-400">{'{{'}param{'}}'} placeholder destekler.</p>
        </div>
      </div>

      {fetching ? (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center gap-3 text-gray-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            Şablon yükleniyor...
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400">Şablon Adı *</label>
                <input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Hoş Geldin Maili"
                  className="mt-2 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-blue-500"
                />
                {!validation.nameOk && <div className="mt-1 text-xs text-red-400">1-100 karakter</div>}
              </div>

              <div>
                <label className="text-xs text-gray-400">Template Kodu *</label>
                <input
                  value={templateCode}
                  disabled={mode === 'edit'}
                  onChange={(e) => setTemplateCode(e.target.value)}
                  placeholder="welcome_member"
                  className="mt-2 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
                <div className="mt-1 text-xs text-gray-500">
                  {mode === 'edit' ? 'ℹ️ Kod değiştirilemez (sistem trigger\'ları bağlı)' : 'ℹ️ Sadece harf/rakam/underscore'}
                </div>
                {mode === 'create' && !validation.codeOk && <div className="mt-1 text-xs text-red-400">1-50 karakter • /^[A-Za-z0-9_]+$/</div>}
              </div>

              <div>
                <label className="text-xs text-gray-400">Konu Satırı *</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Aramıza Hoş Geldin!"
                  className="mt-2 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-blue-500"
                />
                {!validation.subjectOk && <div className="mt-1 text-xs text-red-400">1-200 karakter</div>}
              </div>

              <div>
                <label className="text-xs text-gray-400">Brevo Template ID</label>
                <input
                  value={brevoTemplateId}
                  onChange={(e) => setBrevoTemplateId(e.target.value)}
                  inputMode="numeric"
                  placeholder="(opsiyonel)"
                  className="mt-2 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>


              <div className="flex items-center justify-between gap-3">
                <label className="text-xs text-gray-400">Durum</label>
                <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="text-sm text-white">{isActive ? 'Aktif' : 'Pasif'}</span>
                </label>
              </div>

              <div>
                <label className="text-xs text-gray-400">HTML İçerik *</label>
                <PlaceholderHelper templateCode={selectedCodeForPlaceholders} onInsert={insertPlaceholder} />

                <textarea
                  ref={textareaRef}
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  rows={10}
                  className="mt-3 font-mono text-sm min-h-[200px] bg-gray-700 border border-gray-600 text-white rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-500"
                />
                {!validation.htmlOk && <div className="mt-1 text-xs text-red-400">Boş olamaz</div>}
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              {success && (
                <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                  {success}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onDone}
                  className="px-4 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium border border-gray-600"
                >
                  İptal
                </button>

                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!validation.formOk || submitting || (mode === 'edit' && !dirty)}
                  className="px-4 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {mode === 'create' ? 'Kaydet' : 'Kaydet'}
                </button>
              </div>

              {mode === 'edit' && isSystem && (
                <div className="text-xs text-blue-200 bg-blue-900/20 border border-blue-700 rounded-xl p-3">
                  Sistem şablonu: kod değiştirilemez.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <TemplatePreview htmlContent={htmlContent} />
          </div>
        </div>
      )}
    </div>
  )
}

