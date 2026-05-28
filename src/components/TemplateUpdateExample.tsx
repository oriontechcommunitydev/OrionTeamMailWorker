// Örnek: Template Update Hook Kullanımı
// Bu bileşen, useTemplateActions hook'u kullanarak şablonları yönetir.

import { useState } from 'react'
import { useTemplateActions } from '../lib/useTemplateActions'
import type { EmailTemplate } from '../lib/types'

/**
 * Basit örnek: Şablonu API endpoint'i aracılığıyla güncelle
 */
export default function TemplateUpdateExample() {
  const { updateTemplate, deleteTemplate, loading, error, success, clearMessages } = useTemplateActions()
  const [templateId, setTemplateId] = useState<number>(1)
  const [templateName, setTemplateName] = useState('')
  const [subject, setSubject] = useState('')
  const [htmlContent, setHtmlContent] = useState('')

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()

    const updates: Partial<EmailTemplate> = {}

    if (templateName) updates.template_name = templateName
    if (subject) updates.subject = subject
    if (htmlContent) updates.html_content = htmlContent

    if (Object.keys(updates).length === 0) {
      alert('Lütfen güncellemek için en az bir alan doldurun')
      return
    }

    const result = await updateTemplate(templateId, updates)
    if (result) {
      // Başarı - formu temizle
      setTemplateName('')
      setSubject('')
      setHtmlContent('')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Şablonu silmek istediğinizden emin misiniz? (ID: ${templateId})`)) {
      return
    }

    const result = await deleteTemplate(templateId)
    if (result) {
      setTemplateId(1)
    }
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <h2>📧 Şablon Güncelleme Örneği</h2>

      <div style={{ marginBottom: '15px' }}>
        <label>Template ID:</label>
        <input
          type="number"
          value={templateId}
          onChange={(e) => setTemplateId(Number(e.target.value))}
          placeholder="Template ID"
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>

      <form onSubmit={handleUpdate}>
        <div style={{ marginBottom: '15px' }}>
          <label>Şablon Adı (opsiyonel):</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Yeni ad..."
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Konu Satırı (opsiyonel):</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Yeni konu..."
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>HTML İçerik (opsiyonel):</label>
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            placeholder="Yeni HTML..."
            rows={5}
            style={{ width: '100%', padding: '8px', marginTop: '5px', fontFamily: 'monospace' }}
          />
        </div>

        {error && <div style={{ color: 'red', marginBottom: '10px' }}>❌ Hata: {error}</div>}
        {success && <div style={{ color: 'green', marginBottom: '10px' }}>✅ {success}</div>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Yükleniyor...' : '💾 Güncelle'}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            🗑️ Sil
          </button>
        </div>
      </form>

      <hr style={{ margin: '20px 0' }} />

      <h3>📝 API Endpoint'i Doğrudan Kullanım Örneği</h3>
      <pre
        style={{
          background: '#f5f5f5',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          overflow: 'auto',
        }}
      >
{`// Endpoint:
PATCH /api/templates/:id

// İstek Örneği:
fetch('/api/templates/1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template_name: 'Yeni Ad',
    subject: 'Yeni Konu',
    html_content: '<html>...</html>',
    is_active: true
  })
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err))
`}
      </pre>
    </div>
  )
}
