/** Centralized env access + demo-mode detection. */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL ?? "http://localhost:3000",

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

  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
};

/**
 * Demo mode is on when explicitly enabled OR when Supabase isn't configured.
 * In demo mode the UI runs on mock data so the whole product is navigable
 * without any external accounts.
 */
export const IS_DEMO =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  !env.supabaseUrl ||
  !env.supabaseAnonKey;

/** Provedores externos configurados? Usado pelas rotas para dar erro claro. */
export const HAS_GMAIL_OAUTH = !!(env.googleOAuthClientId && env.googleOAuthClientSecret);
export const HAS_RESEND = !!env.resendApiKey;
export const HAS_VAPI = !!env.vapiPrivateKey;
