import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env['SUPABASE_URL']
const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '[Server Supabase] SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik.\n' +
    'Render Environment Variables kısmına ekle.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
