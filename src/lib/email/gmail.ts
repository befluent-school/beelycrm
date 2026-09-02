/**
 * Provedor de e-mail Gmail API (OAuth 2.0).
 * Envia como a conta autorizada (befluentschooll@gmail.com) via
 * POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send
 *
 * O access token é derivado do refresh token guardado em email_accounts,
 * trocado em https://oauth2.googleapis.com/token e cacheado em memória.
 */

import { env } from "@/lib/env";
import { buildRawMime, type EmailProvider, type SendEmailInput, type SendEmailResult } from "./provider";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}
const tokenCache = new Map<string, CachedToken>();

/** URL para iniciar o consentimento OAuth (usada pela rota /oauth/start). */
export function buildGmailAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.googleOAuthClientId,
    redirect_uri: env.googleOAuthRedirectUri,
    response_type: "code",
    scope: GMAIL_SEND_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/** Troca o authorization code por tokens (usada pela rota /oauth/callback). */
export async function exchangeCodeForTokens(code: string): Promise<{
  refreshToken?: string;
  accessToken?: string;
  expiresIn?: number;
  error?: string;
}> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleOAuthClientId,
      client_secret: env.googleOAuthClientSecret,
      redirect_uri: env.googleOAuthRedirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error_description || data.error || `HTTP ${res.status}` };
  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

async function getAccessToken(refreshToken: string): Promise<string> {
  const cached = tokenCache.get(refreshToken);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.accessToken;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleOAuthClientId,
      client_secret: env.googleOAuthClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Falha ao renovar token Gmail (HTTP ${res.status})`);
  }
  tokenCache.set(refreshToken, {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3000) * 1000,
  });
  return data.access_token;
}

export function createGmailProvider(refreshToken: string): EmailProvider {
  return {
    name: "gmail",
    async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
      try {
        const accessToken = await getAccessToken(refreshToken);
        const raw = buildRawMime({
          ...input,
          fromEmail: input.fromEmail || env.remarketingFromEmail,
          fromName: input.fromName || env.remarketingFromName,
        });
        const res = await fetch(SEND_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: data.error?.message || `HTTP ${res.status}` };
        }
        return { ok: true, id: data.id };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
  };
}
