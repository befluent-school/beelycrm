/** Centralized env access + demo-mode detection. */

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL ?? "http://localhost:3000",

  /* ─── Autenticação própria (sessão, tokens de reset) ───── */
  // Gere com: openssl rand -hex 32 — nunca reaproveite entre ambientes.
  appSecret: process.env.APP_SECRET ?? "",
  sessionDays: Number(process.env.SESSION_DAYS ?? 30),

  /* ─── Google OAuth — LOGIN no Beely (distinto do Gmail/Calendar abaixo) ── */
  googleLoginClientId: process.env.GOOGLE_LOGIN_CLIENT_ID ?? process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
  googleLoginClientSecret: process.env.GOOGLE_LOGIN_CLIENT_SECRET ?? process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
  googleLoginRedirectUri:
    process.env.GOOGLE_LOGIN_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,

  /* ─── SMTP (Hostinger) — e-mails transacionais (reset de senha) ─── */
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 465),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Beely <no-reply@befluentschool.com.br>",

  /* ─── Remarketing por e-mail (Gmail API OAuth) ─────────── */
  googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
  googleOAuthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
  googleOAuthRedirectUri:
    process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/remarketing/oauth/callback`,
  remarketingFromEmail: process.env.REMARKETING_FROM_EMAIL ?? "befluentschooll@gmail.com",
  remarketingFromName: process.env.REMARKETING_FROM_NAME ?? "Be Fluent",

  /* ─── Google Calendar + Meet (mesmo client OAuth do Gmail) ─── */
  googleCalendarRedirectUri:
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/calendar/oauth/callback`,

  /* ─── Resend (fallback opcional de volume) ─────────────── */
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? process.env.EMAIL_FROM ?? "",

  /* ─── Ligações com IA (Vapi) ──────────────────────────── */
  vapiPrivateKey: process.env.VAPI_PRIVATE_KEY ?? "",
  vapiPhoneNumberId: process.env.VAPI_PHONE_NUMBER_ID ?? "",
  vapiAssistantId: process.env.VAPI_ASSISTANT_ID ?? "",
  vapiWebhookSecret: process.env.VAPI_WEBHOOK_SECRET ?? "",

  /* ─── Twilio (opcional, stack self-hosted) ────────────── */
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? "",
};

/**
 * Demo mode liga quando explicitamente pedido OU quando não há banco
 * configurado. Em modo demo a UI roda sobre dados mock/sessão em cookie
 * simples, sem exigir Postgres — útil para navegar o produto sem infra.
 */
export const IS_DEMO =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !env.databaseUrl;

/** Provedores externos configurados? Usado pelas rotas para dar erro claro. */
export const HAS_GMAIL_OAUTH = !!(env.googleOAuthClientId && env.googleOAuthClientSecret);
export const HAS_GOOGLE_LOGIN = !!(env.googleLoginClientId && env.googleLoginClientSecret);
export const HAS_SMTP = !!env.smtpHost;
export const HAS_RESEND = !!env.resendApiKey;
export const HAS_VAPI = !!env.vapiPrivateKey;
