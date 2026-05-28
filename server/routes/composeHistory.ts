import { Router } from 'express'
import { z } from 'zod'

import { supabase } from '../../src/lib/supabaseClient'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

type Status = 'pending' | 'sent' | 'failed'

type ManualEmailRow = {
  id: number
  sender_name: string
  sender_email: string
  to_emails: Array<{ email: string; name: string; type: 'member' | 'speaker' | 'external' }>
  cc_emails: Array<{ email: string; name: string }>
  subject: string
  html_content: string
  status: Status
  brevo_message_ids: string[]
  error_message: string | null
  sent_by: string | null
  sent_at: string | null
  created_at: string
}

export const composeHistoryRouter = Router()

composeHistoryRouter.get('/', async (req, res) => {
  const parsed = querySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query params' })
  }

  const { page, limit } = parsed.data
  const from = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('manual_emails')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const rows = (data ?? []) as ManualEmailRow[]

  return res.status(200).json({
    data: rows,
    total: count ?? 0,
    page,
    limit,
  })
})

/**
 * Mail geçmişinden belirli bir maili siler
 * DELETE /compose-history/:id
 */
composeHistoryRouter.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id as string, 10)

  if (isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Geçersiz ID' })
  }

  try {
    const { error } = await supabase
      .from('manual_emails')
      .delete()
      .eq('id', id)

    if (error) {
      return res.status(500).json({ success: false, error: error.message })
    }

    return res.status(200).json({
      success: true,
      message: 'Mail başarıyla silindi'
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Bilinmeyen hata'
    return res.status(500).json({ success: false, error: errorMsg })
  }
})

