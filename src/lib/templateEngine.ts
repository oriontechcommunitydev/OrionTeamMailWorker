// Template render motoru — {{key}} formatındaki placeholder'ları değiştirir

/**
 * HTML içeriğindeki {{key}} placeholder'larını params değerleriyle değiştirir.
 * Eşleşmeyen placeholder'lar boş string ile değiştirilir.
 * Global replace: aynı placeholder birden fazla kez olabilir.
 */
export function renderTemplate(html: string, params: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return Object.prototype.hasOwnProperty.call(params, key) ? params[key] : ''
  })
}

/**
 * Subject string'indeki {{key}} placeholder'larını params değerleriyle değiştirir.
 * renderTemplate ile aynı mantık, konu satırı için ayrı fonksiyon.
 */
export function renderSubject(subject: string, params: Record<string, string>): string {
  return subject.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return Object.prototype.hasOwnProperty.call(params, key) ? params[key] : ''
  })
}

export function wrapWithEmailLayout(htmlContent: string, settings: import('./types').EmailSettings): string {
  const senderName = settings.sender_name
  const logoUrl = settings.sender_logo_url
  const senderWebsite = settings.sender_website
  const senderAddress = settings.sender_address
  const year = new Date().getFullYear()

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${senderName}" />`
    : ''

  const websiteHtml = senderWebsite
    ? `<div style="margin-top: 6px;"><a href="${senderWebsite}" target="_blank" rel="noopener noreferrer" style="color:#666666; text-decoration:none;">${senderWebsite}</a></div>`
    : ''

  const addressHtml = senderAddress ? `<p style="margin: 6px 0 0 0;">${senderAddress}</p>` : ''

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; padding:0; background:#f4f4f4; font-family: Arial, sans-serif; }
    .email-wrapper { max-width:600px; margin:0 auto; background:#ffffff; }

    .email-header { background:#1a1a2e; padding:24px 32px; text-align:center; }
    .email-header img { max-height:60px; max-width:200px; object-fit:contain; }
    .email-header .brand-name { color:#ffffff; font-size:20px; font-weight:bold; margin-top:8px; }

    .email-body { padding:32px; color:#333333; font-size:15px; line-height:1.6; }
    .email-body h1 { color:#1a1a2e; font-size:24px; margin-bottom:16px; }
    .email-body h2 { color:#1a1a2e; font-size:20px; margin-bottom:12px; }
    .email-body p  { margin-bottom:12px; }
    .email-body strong { color:#1a1a2e; }
    .email-body a  { color:#4f46e5; }

    .email-footer { background:#f8f8f8; border-top:1px solid #eeeeee; padding:20px 32px; text-align:center; color:#999999; font-size:12px; line-height:1.8; }
    .email-footer a { color:#666666; text-decoration:none; }
  </style>
</head>
<body>
  <div class="email-wrapper">

    <div class="email-header">
      ${logoHtml}
      <div class="brand-name">${senderName}</div>
    </div>

    <div class="email-body">
      ${htmlContent}
    </div>

    <div class="email-footer">
      <p>Bu mail ${senderName} tarafından gönderilmiştir.</p>
      ${websiteHtml}
      ${addressHtml}
      <p style="margin-top:8px; color:#cccccc; font-size:11px;">
        © ${year} ${senderName}. Tüm hakları saklıdır.
      </p>
    </div>

  </div>
</body>
</html>`
}

