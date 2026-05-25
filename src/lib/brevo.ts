// Brevo API entegrasyonu — Mail gönderme işlemleri

import axios, { AxiosError } from 'axios'
import { BrevoSendPayload, BrevoSendResponse } from './types'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

/**
 * HTTP status koduna göre retry yapılıp yapılamayacağını belirler.
 * 4xx → false (client hatası, retry anlamsız)
 * 5xx → true  (server hatası, retry yapılabilir)
 */
export function isRetryable(status: number): boolean {
  return status >= 500
}

/**
 * Brevo API üzerinden mail gönderir.
 *
 * KURAL 1: brevo_template_id varsa → templateId + params gönder (htmlContent/subject yok)
 * KURAL 2: brevo_template_id yoksa → subject + htmlContent gönder
 * KURAL 3: 4xx → direkt failed, 5xx → retry yapılabilir
 */
export async function sendEmail(
  payload: BrevoSendPayload,
  apiKey: string
): Promise<BrevoSendResponse> {
  // Brevo'ya gönderilecek body oluştur
  let body: Record<string, unknown>

  if (payload.templateId != null) {
    // Brevo template kullan: htmlContent ve subject gönderme
    body = {
      sender: payload.sender,
      to: payload.to,
      cc: payload.cc ?? undefined,
      templateId: payload.templateId,
      params: payload.params ?? {},
    }
  } else {
    // Kendi HTML içeriğimizi kullan
    body = {
      sender: payload.sender,
      to: payload.to,
      cc: payload.cc ?? undefined,
      subject: payload.subject,
      htmlContent: payload.htmlContent,
    }
  }

  try {
    const response = await axios.post<BrevoSendResponse>(BREVO_API_URL, body, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 15000, // 15 saniye timeout
    })

    return response.data
  } catch (err) {
    const axiosErr = err as AxiosError<{ message?: string; code?: string }>

    if (axiosErr.response) {
      const status = axiosErr.response.status
      const apiMessage = axiosErr.response.data?.message ?? 'Bilinmeyen Brevo hatası'
      const retryable = isRetryable(status)

      const errorMessage = `[Brevo] HTTP ${status}: ${apiMessage}${retryable ? ' (retry yapılabilir)' : ' (retry yapılmaz)'}`
      throw new BrevoError(errorMessage, status, retryable)
    }

    // Ağ hatası (timeout, DNS vb.) → retry yapılabilir
    throw new BrevoError(
      `[Brevo] Ağ hatası: ${axiosErr.message}`,
      0,
      true
    )
  }
}

/**
 * Brevo API hatalarını taşıyan özel hata sınıfı.
 * retryable: true ise worker tekrar deneyecek, false ise direkt failed.
 */
export class BrevoError extends Error {
  public readonly statusCode: number
  public readonly retryable: boolean

  constructor(message: string, statusCode: number, retryable: boolean) {
    super(message)
    this.name = 'BrevoError'
    this.statusCode = statusCode
    this.retryable = retryable
  }
}
