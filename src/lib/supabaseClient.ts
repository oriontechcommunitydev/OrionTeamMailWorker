// Browser-side Supabase client (Anon Key)
// Singleton pattern — Dashboard UI realtime güncellemeleri için

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Vite env değişkenleri — VITE_ prefix gerekli (browser-safe)
// import.meta.env koşullu olarak erişilir, tanımlı değilse fallback kullan
const getEnv = () => {
  try {
    const env = (import.meta as ImportMeta & { env: Record<string, string> }).env
    return {
      url: env['SUPABASE_URL'] || env['VITE_SUPABASE_URL'],
      key: env['SUPABASE_ANON_KEY'] || env['VITE_SUPABASE_ANON_KEY']
    }
  } catch {
    return { url: undefined, key: undefined }
  }
}

const envVars = getEnv()

// Fallback: env yoksa hardcoded değerleri kullan (geliştirme kolaylığı için)
const SUPABASE_URL = envVars.url ?? 'https://vbokappwelyrvoxnkigp.supabase.co'
const SUPABASE_ANON_KEY = envVars.key ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZib2thcHB3ZWx5cnZveG5raWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDk4NzYsImV4cCI6MjA5Mjg4NTg3Nn0.H1Rhc_d6aYqBVjrGg6Ze0PTDemL70KlvKvMzQdPqzYA'

// Singleton instance
let instance: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!instance) {
    instance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return instance
}

export const supabase = getSupabaseClient()
