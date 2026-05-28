import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import type { EmailTemplate } from '../../src/lib/types'

export const templatesRouter = Router()

// Sistem şablonları (değiştirilemez)
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

// ─────────────────────────────────────────────────────────
// GET /api/templates — Tüm şablonları getir
// ─────────────────────────────────────────────────────────
templatesRouter.get('/templates', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('template_name', { ascending: true })

    if (error) throw error

    res.status(200).json({
      success: true,
      data: data as EmailTemplate[],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Şablonlar yüklenemedi'
    res.status(500).json({ success: false, error: message })
  }
})

// ─────────────────────────────────────────────────────────
// GET /api/templates/:id — Belirli bir şablonu getir
// ─────────────────────────────────────────────────────────
templatesRouter.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id || Number.isNaN(Number(id))) {
      res.status(400).json({ success: false, error: 'Geçersiz template ID' })
      return
    }

    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', Number(id))
      .single()

    if (error) throw error
    if (!data) {
      res.status(404).json({ success: false, error: 'Şablon bulunamadı' })
      return
    }

    res.status(200).json({
      success: true,
      data: data as EmailTemplate,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Şablon yüklenemedi'
    res.status(500).json({ success: false, error: message })
  }
})

// ─────────────────────────────────────────────────────────
// POST /api/templates — Yeni şablon oluştur
// ─────────────────────────────────────────────────────────
templatesRouter.post('/templates', async (req: Request, res: Response) => {
  try {
    const {
      template_name,
      template_code,
      brevo_template_id,
      subject,
      html_content,
      is_active = true,
    } = req.body

    // Validasyon
    if (!template_name || template_name.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Template adı zorunludur' })
      return
    }

    if (!template_code || template_code.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Template kodu zorunludur' })
      return
    }

    if (!/^[A-Za-z0-9_]+$/.test(template_code.trim())) {
      res.status(400).json({
        success: false,
        error: 'Template kodu sadece harf, rakam ve underscore içerebilir',
      })
      return
    }

    if (!subject || subject.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Konu satırı zorunludur' })
      return
    }

    if (!html_content || html_content.trim().length === 0) {
      res.status(400).json({ success: false, error: 'HTML içerik zorunludur' })
      return
    }

    // Template code unique kontrolü
    const { data: existing, error: checkError } = await supabase
      .from('email_templates')
      .select('id')
      .eq('template_code', template_code.trim())
      .maybeSingle()

    if (checkError) throw checkError
    if (existing) {
      res.status(409).json({
        success: false,
        error: 'Bu template kodu zaten kullanımda',
      })
      return
    }

    const brevoId = brevo_template_id ? Number(brevo_template_id) : null

    const { data, error } = await supabase.from('email_templates').insert({
      template_name: template_name.trim(),
      template_code: template_code.trim(),
      brevo_template_id: brevoId,
      subject: subject.trim(),
      html_content,
      is_active,
    }).select().single()

    if (error) throw error

    res.status(201).json({
      success: true,
      data: data as EmailTemplate,
      message: 'Şablon başarıyla oluşturuldu',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Şablon oluşturulamadı'
    res.status(500).json({ success: false, error: message })
  }
})

// ─────────────────────────────────────────────────────────
// PATCH /api/templates/:id — Şablonu güncelle
// ─────────────────────────────────────────────────────────
templatesRouter.patch('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const {
      template_name,
      brevo_template_id,
      subject,
      html_content,
      is_active,
    } = req.body

    if (!id || Number.isNaN(Number(id))) {
      res.status(400).json({ success: false, error: 'Geçersiz template ID' })
      return
    }

    // Şablonu bul
    const { data: template, error: fetchError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', Number(id))
      .single()

    if (fetchError || !template) {
      res.status(404).json({ success: false, error: 'Şablon bulunamadı' })
      return
    }

    // Sistem şablonuna karşı kontrol
    if (SYSTEM_TEMPLATE_CODES.has(template.template_code)) {
      res.status(403).json({
        success: false,
        error: 'Sistem şablonları kısıtlı biçimde düzenlenebilir',
      })
      return
    }

    // Validasyon
    if (template_name !== undefined) {
      if (template_name.trim().length === 0) {
        res.status(400).json({ success: false, error: 'Template adı boş olamaz' })
        return
      }
      if (template_name.trim().length > 100) {
        res.status(400).json({
          success: false,
          error: 'Template adı 100 karakteri geçemez',
        })
        return
      }
    }

    if (subject !== undefined) {
      if (subject.trim().length === 0) {
        res.status(400).json({ success: false, error: 'Konu satırı boş olamaz' })
        return
      }
      if (subject.trim().length > 200) {
        res.status(400).json({
          success: false,
          error: 'Konu satırı 200 karakteri geçemez',
        })
        return
      }
    }

    if (html_content !== undefined) {
      if (html_content.trim().length === 0) {
        res.status(400).json({ success: false, error: 'HTML içerik boş olamaz' })
        return
      }
    }

    // Güncelleme verilerini hazırla
    const updateData: Partial<EmailTemplate> = {}

    if (template_name !== undefined) {
      updateData.template_name = template_name.trim()
    }
    if (subject !== undefined) {
      updateData.subject = subject.trim()
    }
    if (html_content !== undefined) {
      updateData.html_content = html_content
    }
    if (brevo_template_id !== undefined) {
      updateData.brevo_template_id = brevo_template_id ? Number(brevo_template_id) : null
    }
    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active)
    }

    // Veritabanında güncelle
    const { data: updated, error } = await supabase
      .from('email_templates')
      .update(updateData)
      .eq('id', Number(id))
      .select()
      .single()

    if (error) throw error

    res.status(200).json({
      success: true,
      data: updated as EmailTemplate,
      message: 'Şablon başarıyla güncellendi',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Şablon güncellenemedi'
    res.status(500).json({ success: false, error: message })
  }
})

// ─────────────────────────────────────────────────────────
// DELETE /api/templates/:id — Şablonu sil
// ─────────────────────────────────────────────────────────
templatesRouter.delete('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id || Number.isNaN(Number(id))) {
      res.status(400).json({ success: false, error: 'Geçersiz template ID' })
      return
    }

    // Şablonu bul
    const { data: template, error: fetchError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', Number(id))
      .single()

    if (fetchError || !template) {
      res.status(404).json({ success: false, error: 'Şablon bulunamadı' })
      return
    }

    // Sistem şablonu silinemez
    if (SYSTEM_TEMPLATE_CODES.has(template.template_code)) {
      res.status(403).json({
        success: false,
        error: 'Sistem şablonları silinemez',
      })
      return
    }

    // Sil
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', Number(id))

    if (error) throw error

    res.status(200).json({
      success: true,
      message: 'Şablon başarıyla silindi',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Şablon silinemedi'
    res.status(500).json({ success: false, error: message })
  }
})
