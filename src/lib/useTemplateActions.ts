// Template API hook — API endpoint'leri kullanarak şablon operasyonları yapılır

import { useState, useCallback } from 'react'
import type { EmailTemplate } from './types'

export interface UseTemplateActionsResult {
  loading: boolean
  error: string | null
  success: string | null
  createTemplate: (template: Omit<EmailTemplate, 'id' | 'created_at'>) => Promise<EmailTemplate | null>
  updateTemplate: (id: number, updates: Partial<EmailTemplate>) => Promise<EmailTemplate | null>
  deleteTemplate: (id: number) => Promise<boolean>
  fetchTemplates: () => Promise<EmailTemplate[]>
  fetchTemplate: (id: number) => Promise<EmailTemplate | null>
  clearMessages: () => void
}

const API_BASE = '/api'

export function useTemplateActions(): UseTemplateActionsResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  const createTemplate = useCallback(
    async (template: Omit<EmailTemplate, 'id' | 'created_at'>): Promise<EmailTemplate | null> => {
      setLoading(true)
      clearMessages()
      try {
        const response = await fetch(`${API_BASE}/templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_name: template.template_name,
            template_code: template.template_code,
            brevo_template_id: template.brevo_template_id,
            subject: template.subject,
            html_content: template.html_content,
            is_active: template.is_active,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Şablon oluşturulamadı')
        }

        const data = await response.json()
        setSuccess(data.message || 'Şablon başarıyla oluşturuldu')
        return data.data as EmailTemplate
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Şablon oluşturulamadı'
        setError(msg)
        return null
      } finally {
        setLoading(false)
      }
    },
    [clearMessages]
  )

  const updateTemplate = useCallback(
    async (id: number, updates: Partial<EmailTemplate>): Promise<EmailTemplate | null> => {
      setLoading(true)
      clearMessages()
      try {
        const response = await fetch(`${API_BASE}/templates/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Şablon güncellenemedi')
        }

        const data = await response.json()
        setSuccess(data.message || 'Şablon başarıyla güncellendi')
        return data.data as EmailTemplate
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Şablon güncellenemedi'
        setError(msg)
        return null
      } finally {
        setLoading(false)
      }
    },
    [clearMessages]
  )

  const deleteTemplate = useCallback(
    async (id: number): Promise<boolean> => {
      setLoading(true)
      clearMessages()
      try {
        const response = await fetch(`${API_BASE}/templates/${id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Şablon silinemedi')
        }

        const data = await response.json()
        setSuccess(data.message || 'Şablon başarıyla silindi')
        return true
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Şablon silinemedi'
        setError(msg)
        return false
      } finally {
        setLoading(false)
      }
    },
    [clearMessages]
  )

  const fetchTemplates = useCallback(async (): Promise<EmailTemplate[]> => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/templates`)
      if (!response.ok) {
        throw new Error('Şablonlar yüklenemedi')
      }
      const data = await response.json()
      return data.data as EmailTemplate[]
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Şablonlar yüklenemedi'
      setError(msg)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTemplate = useCallback(
    async (id: number): Promise<EmailTemplate | null> => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${API_BASE}/templates/${id}`)
        if (!response.ok) {
          throw new Error('Şablon yüklenemedi')
        }
        const data = await response.json()
        return data.data as EmailTemplate
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Şablon yüklenemedi'
        setError(msg)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    success,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    fetchTemplates,
    fetchTemplate,
    clearMessages,
  }
}
