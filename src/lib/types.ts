// TypeScript type tanımları — Mailer Dashboard

export interface EmailQueueItem {
  id: number
  recipient_email: string
  recipient_name: string | null
  template_code: string
  template_params: Record<string, string>
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'sent' | 'failed'
  attempt_count: number
  last_attempt_at: string | null
  sent_at: string | null
  error_message: string | null
  brevo_message_id: string | null
  created_at: string
  updated_at: string
}

export interface EmailTemplate {
  id: number
  template_name: string
  template_code: string
  brevo_template_id: number | null
  subject: string
  html_content: string
  is_active: boolean
  created_at: string
}

export interface EmailSettings {
  brevo_api_key: string
  sender_email: string
  sender_name: string
  daily_limit: number
  retry_limit: number
  enabled: boolean

  sender_logo_url: string | null
  sender_website: string | null
  sender_address: string | null
}


export interface EmailSettingRaw {
  id: number
  setting_key: string
  setting_value: string | null
  updated_at: string
}

export interface BrevoRecipient {
  email: string
  name?: string
}

export interface BrevoSendPayload {
  sender: { name: string; email: string }
  to: BrevoRecipient[]
  cc?: BrevoRecipient[]
  subject?: string
  htmlContent?: string
  templateId?: number
  params?: Record<string, string>
}


export interface BrevoSendResponse {
  messageId: string
}

export interface DashboardStats {
  total_pending: number
  total_sent: number
  total_failed: number
  sent_today: number
  daily_limit: number
  last_run_at: string | null
}

export interface WorkerResult {
  success: boolean
  sent: number
  failed: number
  skipped: number
  message: string
}

export type StatusFilter = 'all' | 'pending' | 'sent' | 'failed'

export interface QueueResponse {
  data: EmailQueueItem[]
  total: number
  page: number
  limit: number
}

export interface Recipient {
  id?: string
  email: string
  name: string
  type: 'member' | 'speaker' | 'external'
  avatar?: string | null
}

export interface ManualEmail {
  id: number
  sender_name: string
  sender_email: string
  to_emails: Recipient[]
  cc_emails: Array<{ email: string; name: string }>
  subject: string
  html_content: string
  status: 'pending' | 'sent' | 'failed'
  brevo_message_ids: string[]
  error_message: string | null
  sent_by: string | null
  sent_at: string | null
  created_at: string
}

export interface ComposePayload {
  to: Recipient[]
  cc?: Array<{ email: string; name: string }>
  subject: string
  html_content: string
  sent_by?: string
}

export interface SendResultItem {
  email: string
  success: boolean
  messageId?: string
  error?: string
}

export interface SendResult {
  success: boolean
  sent_count: number
  failed_count: number
  results: SendResultItem[]
}

export interface RecipientSearchResult {
  id: string
  name: string
  email: string
  type: 'member' | 'speaker'
  subtitle: string
  avatar: string | null
}

