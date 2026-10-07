/**
 * Google OAuth 2.0 (Authorization Code + OpenID Connect) para LOGIN no
 * Beely — fluxo manual, sem mediador (diferente do fluxo Supabase Auth
 * anterior). Mesmo padrão do BeeFlow: troca o code pelo id_token, verifica
 * a assinatura contra o JWKS público do Google, extrai email/sub.
 *
 * Distinto do OAuth do Gmail/Calendar (src/lib/email, src/lib/calendar) —
 * aquele é para enviar e-mail/criar evento EM NOME da conta
 * befluentschooll@gmail.com (uma finalidade de integração do produto);
 * este é para autenticar QUEM está entrando no Beely. Podem usar o mesmo
 * Client ID/Secret do Google Cloud Console (mesmo projeto), mas são
 * fluxos e redirect URIs completamente separados.
 */
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "@/lib/env";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

const jwks = createRemoteJWKSet(new URL(JWKS_URL));

export function googleLoginEnabled(): boolean {
  return !!(env.googleLoginClientId && env.googleLoginClientSecret);
}

export function buildGoogleLoginUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.googleLoginClientId,
    redirect_uri: env.googleLoginRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleIdentity | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleLoginClientId,
      client_secret: env.googleLoginClientSecret,
      redirect_uri: env.googleLoginRedirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id_token) {
    console.error("[auth/google] token exchange falhou:", data.error_description ?? data.error ?? `HTTP ${res.status}`);
    return null;
  }

  try {
    const { payload } = await jwtVerify(data.id_token, jwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: env.googleLoginClientId,
    });

    if (!payload.email || payload.email_verified !== true) return null;

    return {
      sub: String(payload.sub),
      email: String(payload.email),
      emailVerified: true,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  } catch (e) {
    console.error("[auth/google] falha ao verificar id_token:", e);
    return null;
  }
}
