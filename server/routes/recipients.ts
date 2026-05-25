import { Router } from 'express'
import { z } from 'zod'

import { supabase } from '../../src/lib/supabaseClient'

const querySchema = z.object({
  q: z.string().optional().default(''),
  type: z.enum(['all', 'member', 'speaker']).optional().default('all'),
})

type RecipientType = 'member' | 'speaker'

type RecipientRow = {
  id: string
  name: string
  email: string
  type: RecipientType
  subtitle: string
  avatar: string | null
}

export const recipientsRouter = Router()

recipientsRouter.get('/', async (req, res) => {
  const parsed = querySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query params' })
  }

  const { q, type } = parsed.data
  const trimmed = q.trim()

  if (trimmed.length < 2) {
    return res.status(200).json({ data: [] })
  }

  const pattern = `%${trimmed}%`

  const results: RecipientRow[] = []

  const doMembers = type === 'all' || type === 'member'
  const doSpeakers = type === 'all' || type === 'speaker'

  if (doMembers) {
    const { data: memberRows, error: memberErr } = await supabase
      .from('members')
      .select('id,name,email,avatar,job_title')
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .not('email', 'is', null)
      .eq('is_active', true)
      .limit(5)

    if (memberErr) {
      return res.status(500).json({ error: memberErr.message })
    }

    for (const r of (memberRows ?? []) as Array<any>) {
      if (!r.email) continue
      results.push({
        id: r.id,
        name: r.name,
        email: r.email,
        type: 'member',
        subtitle: r.job_title ?? '',
        avatar: r.avatar ?? null,
      })
    }
  }

  if (doSpeakers) {
    const { data: speakerRows, error: speakerErr } = await supabase
      .from('speakers')
      .select('id,full_name,email,image_url,title,company')
      .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
      .not('email', 'is', null)
      .limit(5)

    if (speakerErr) {
      return res.status(500).json({ error: speakerErr.message })
    }

    for (const r of (speakerRows ?? []) as Array<any>) {
      if (!r.email) continue
      results.push({
        id: r.id,
        name: r.full_name,
        email: r.email,
        type: 'speaker',
        subtitle: `${r.title ?? ''}${r.company ? ` · ${r.company}` : ''}`.trim(),
        avatar: r.image_url ?? null,
      })
    }
  }

  return res.status(200).json({ data: results.slice(0, 5) })
})

