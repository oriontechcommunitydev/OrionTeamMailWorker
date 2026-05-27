"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/index.ts
var import_express2 = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");

// server/routes/composeSend.ts
var import_express = require("express");

// src/lib/supabaseClient.ts
var import_supabase_js = require("@supabase/supabase-js");
var import_meta = {};
var supabaseUrl = import_meta.env["VITE_SUPABASE_URL"];
var supabaseAnonKey = import_meta.env["VITE_SUPABASE_ANON_KEY"];
var SUPABASE_URL = supabaseUrl ?? "https://vbokappwelyrvoxnkigp.supabase.co";
var SUPABASE_ANON_KEY = supabaseAnonKey ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZib2thcHB3ZWx5cnZveG5raWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDk4NzYsImV4cCI6MjA5Mjg4NTg3Nn0.H1Rhc_d6aYqBVjrGg6Ze0PTDemL70KlvKvMzQdPqzYA";
var instance = null;
function getSupabaseClient() {
  if (!instance) {
    instance = (0, import_supabase_js.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return instance;
}
var supabase = getSupabaseClient();

// src/lib/settingsLoader.ts
async function loadEmailSettings(supabase2) {
  const { data, error } = await supabase2.from("email_settings").select("*");
  if (error) {
    throw new Error(`[Mailer] email_settings y\xFCklenemedi: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error("[Mailer] email_settings tablosu bo\u015F veya eri\u015Filemiyor.");
  }
  const settingsMap = {};
  data.forEach((row) => {
    settingsMap[row.setting_key] = row.setting_value;
  });
  const requiredKeys = ["brevo_api_key", "sender_email", "sender_name", "daily_limit", "retry_limit", "enabled"];
  for (const key of requiredKeys) {
    if (!(key in settingsMap)) {
      throw new Error(`[Mailer] Eksik ayar: '${key}' email_settings tablosunda bulunamad\u0131.`);
    }
  }
  return {
    brevo_api_key: settingsMap["brevo_api_key"] ?? "",
    sender_email: settingsMap["sender_email"] ?? "",
    sender_name: settingsMap["sender_name"] ?? "",
    daily_limit: parseInt(settingsMap["daily_limit"] ?? "300", 10),
    retry_limit: parseInt(settingsMap["retry_limit"] ?? "3", 10),
    enabled: settingsMap["enabled"] === "true",
    sender_logo_url: settingsMap["sender_logo_url"] ?? null,
    sender_website: settingsMap["sender_website"] ?? null,
    sender_address: settingsMap["sender_address"] ?? null
  };
}

// src/lib/brevo.ts
var import_axios = __toESM(require("axios"), 1);
var BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
function isRetryable(status) {
  return status >= 500;
}
async function sendEmail(payload, apiKey) {
  let body;
  if (payload.templateId != null) {
    body = {
      sender: payload.sender,
      to: payload.to,
      cc: payload.cc ?? void 0,
      templateId: payload.templateId,
      params: payload.params ?? {}
    };
  } else {
    body = {
      sender: payload.sender,
      to: payload.to,
      cc: payload.cc ?? void 0,
      subject: payload.subject,
      htmlContent: payload.htmlContent
    };
  }
  try {
    const response = await import_axios.default.post(BREVO_API_URL, body, {
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      timeout: 15e3
      // 15 saniye timeout
    });
    return response.data;
  } catch (err) {
    const axiosErr = err;
    if (axiosErr.response) {
      const status = axiosErr.response.status;
      const apiMessage = axiosErr.response.data?.message ?? "Bilinmeyen Brevo hatas\u0131";
      const retryable = isRetryable(status);
      const errorMessage = `[Brevo] HTTP ${status}: ${apiMessage}${retryable ? " (retry yap\u0131labilir)" : " (retry yap\u0131lmaz)"}`;
      throw new BrevoError(errorMessage, status, retryable);
    }
    throw new BrevoError(
      `[Brevo] A\u011F hatas\u0131: ${axiosErr.message}`,
      0,
      true
    );
  }
}
var BrevoError = class extends Error {
  statusCode;
  retryable;
  constructor(message, statusCode, retryable) {
    super(message);
    this.name = "BrevoError";
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
};

// src/lib/templateEngine.ts
function wrapWithEmailLayout(htmlContent, settings) {
  const senderName = settings.sender_name;
  const logoUrl = settings.sender_logo_url;
  const senderWebsite = settings.sender_website;
  const senderAddress = settings.sender_address;
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="${senderName}" />` : "";
  const websiteHtml = senderWebsite ? `<div style="margin-top: 6px;"><a href="${senderWebsite}" target="_blank" rel="noopener noreferrer" style="color:#666666; text-decoration:none;">${senderWebsite}</a></div>` : "";
  const addressHtml = senderAddress ? `<p style="margin: 6px 0 0 0;">${senderAddress}</p>` : "";
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
      <p>Bu mail ${senderName} taraf\u0131ndan g\xF6nderilmi\u015Ftir.</p>
      ${websiteHtml}
      ${addressHtml}
      <p style="margin-top:8px; color:#cccccc; font-size:11px;">
        \xA9 ${year} ${senderName}. T\xFCm haklar\u0131 sakl\u0131d\u0131r.
      </p>
    </div>

  </div>
</body>
</html>`;
}

// server/routes/composeSend.ts
var router = (0, import_express.Router)();
router.post("/compose/send", async (req, res) => {
  console.log("[composeSend] istek al\u0131nd\u0131, body keys:", Object.keys(req.body ?? {}));
  try {
    const body = req.body;
    if (!body.to || body.to.length === 0) {
      res.status(400).json({ success: false, error: "En az bir al\u0131c\u0131 gerekli" });
      return;
    }
    if (!body.subject || body.subject.trim() === "") {
      res.status(400).json({ success: false, error: "Konu bo\u015F olamaz" });
      return;
    }
    if (!body.html_content || body.html_content.trim() === "") {
      res.status(400).json({ success: false, error: "\u0130\xE7erik bo\u015F olamaz" });
      return;
    }
    let settings;
    try {
      settings = await loadEmailSettings(supabase);
    } catch (err) {
      console.error("[composeSend] settings hatas\u0131:", err);
      res.status(500).json({
        success: false,
        error: "Ayarlar y\xFCklenemedi: " + (err instanceof Error ? err.message : "Bilinmeyen")
      });
      return;
    }
    if (!settings.enabled) {
      res.status(503).json({ success: false, error: "Mail sistemi devre d\u0131\u015F\u0131" });
      return;
    }
    const { data: inserted, error: insertError } = await supabase.from("manual_emails").insert({
      sender_name: settings.sender_name,
      sender_email: settings.sender_email,
      to_emails: body.to,
      cc_emails: body.cc ?? [],
      subject: body.subject,
      html_content: body.html_content,
      status: "pending",
      brevo_message_ids: [],
      sent_by: body.sent_by ?? null
    }).select().single();
    if (insertError || !inserted) {
      console.error("[composeSend] insert hatas\u0131:", insertError);
      res.status(500).json({
        success: false,
        error: insertError?.message ?? "DB kay\u0131t hatas\u0131"
      });
      return;
    }
    console.log("[composeSend] DB kayd\u0131 olu\u015Ftu, id:", inserted.id);
    const results = [];
    const messageIds = [];
    const wrappedHtml = wrapWithEmailLayout(body.html_content, settings);
    for (const recipient of body.to) {
      try {
        const brevoResp = await sendEmail(
          {
            sender: { name: settings.sender_name, email: settings.sender_email },
            to: [{ email: recipient.email, name: recipient.name }],
            cc: body.cc ?? [],
            subject: body.subject,
            htmlContent: wrappedHtml
          },
          settings.brevo_api_key
        );
        messageIds.push(brevoResp.messageId);
        results.push({ email: recipient.email, success: true, messageId: brevoResp.messageId });
        console.log("[composeSend] g\xF6nderildi:", recipient.email);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "G\xF6nderilemedi";
        results.push({ email: recipient.email, success: false, error: errMsg });
        console.error("[composeSend] g\xF6nderim hatas\u0131:", recipient.email, errMsg);
      }
    }
    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;
    await supabase.from("manual_emails").update({
      status: sentCount > 0 ? "sent" : "failed",
      brevo_message_ids: messageIds,
      error_message: failedCount > 0 ? `${failedCount} al\u0131c\u0131ya g\xF6nderilemedi` : null,
      sent_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", inserted.id);
    console.log(`[composeSend] tamamland\u0131: ${sentCount} g\xF6nderildi, ${failedCount} hata`);
    res.status(200).json({
      success: failedCount === 0,
      sent_count: sentCount,
      failed_count: failedCount,
      results
    });
  } catch (err) {
    console.error("[composeSend] beklenmeyen hata:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Sunucu hatas\u0131",
      sent_count: 0,
      failed_count: 0,
      results: []
    });
  }
});

// server/index.ts
var import_meta2 = {};
var __filename = (0, import_url.fileURLToPath)(import_meta2.url);
var __dirname = import_path.default.dirname(__filename);
var app = (0, import_express2.default)();
var port = Number(process.env.PORT ?? 3e3);
app.use((0, import_cors.default)({ origin: true, credentials: false }));
app.use(import_express2.default.json({ limit: "10mb" }));
app.use(import_express2.default.urlencoded({ extended: true }));
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});
app.use("/api", router);
var distPath = import_path.default.join(__dirname, "../dist");
app.use(import_express2.default.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(import_path.default.join(distPath, "index.html"));
});
app.listen(port, "0.0.0.0", () => {
  console.log(`[server] http://localhost:${port}`);
});
