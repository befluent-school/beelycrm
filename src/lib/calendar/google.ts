/**
 * Google Calendar API (OAuth 2.0) — cria eventos com link do Google Meet
 * automático. Mesmo client OAuth do Gmail (GOOGLE_OAUTH_CLIENT_ID/SECRET),
 * redirect URI e escopo próprios (calendar.events), conexão independente
 * da conta de Remarketing.
 *
 * POST https://www.googleapis.com/calendar/v3/calendars/primary/events
 *   ?conferenceDataVersion=1
 */

import { env } from "@/lib/env";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}
const tokenCache = new Map<string, CachedToken>();

export function buildCalendarAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.googleOAuthClientId,
    redirect_uri: env.googleCalendarRedirectUri,
    response_type: "code",
    scope: `${CALENDAR_SCOPE} email`,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCalendarCode(code: string): Promise<{
  refreshToken?: string;
  accessToken?: string;
  expiresIn?: number;
  email?: string;
  error?: string;
}> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleOAuthClientId,
      client_secret: env.googleOAuthClientSecret,
      redirect_uri: env.googleCalendarRedirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error_description || data.error || `HTTP ${res.status}` };

  let email: string | undefined;
  if (data.access_token) {
    const info = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    }).then((r) => r.json()).catch(() => null);
    email = info?.email;
  }

  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    email,
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
    throw new Error(data.error_description || data.error || `Falha ao renovar token do Google Calendar (HTTP ${res.status})`);
  }
  tokenCache.set(refreshToken, {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3000) * 1000,
  });
  return data.access_token;
}

export interface CreateEventInput {
  refreshToken: string;
  summary: string;
  description?: string;
  startISO: string;
  endISO: string;
  attendeeEmail?: string;
  timeZone?: string;
}

export interface CreateEventResult {
  ok: boolean;
  eventId?: string;
  htmlLink?: string;
  meetLink?: string;
  error?: string;
}

export async function createCalendarEvent(input: CreateEventInput): Promise<CreateEventResult> {
  try {
    const accessToken = await getAccessToken(input.refreshToken);
    const res = await fetch(`${EVENTS_URL}?conferenceDataVersion=1&sendUpdates=all`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.startISO, timeZone: input.timeZone ?? "America/Sao_Paulo" },
        end: { dateTime: input.endISO, timeZone: input.timeZone ?? "America/Sao_Paulo" },
        attendees: input.attendeeEmail ? [{ email: input.attendeeEmail }] : undefined,
        conferenceData: {
          createRequest: {
            requestId: `beely-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error?.message || `HTTP ${res.status}` };
    }
    const meetLink = data.conferenceData?.entryPoints?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => e.entryPointType === "video"
    )?.uri;
    return { ok: true, eventId: data.id, htmlLink: data.htmlLink, meetLink };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
