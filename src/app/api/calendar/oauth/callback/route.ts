import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { exchangeCalendarCode } from "@/lib/calendar/google";
import { saveCalendarAccount } from "@/lib/calendar/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/calendar/oauth/callback?code=...&state=...
 * Troca o code por refresh token e persiste a conexão do Google Calendar.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const err = searchParams.get("error");

  const back = (params: Record<string, string>) => {
    const u = new URL("/integracoes", env.appUrl);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return NextResponse.redirect(u);
  };

  if (err) return back({ calendar: "erro", detail: err });
  if (!code) return back({ calendar: "erro", detail: "code ausente" });

  const cookieState = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("beely_calendar_oauth_state="))
    ?.split("=")[1];
  if (cookieState && state && cookieState !== state) {
    return back({ calendar: "erro", detail: "state inválido" });
  }

  const tokens = await exchangeCalendarCode(code);
  if (tokens.error || !tokens.refreshToken) {
    await saveCalendarAccount({
      email: tokens.email ?? "",
      status: "error",
      lastError: tokens.error ?? "Google não retornou refresh_token. Revogue o acesso em myaccount.google.com/permissions e reconecte.",
    });
    return back({ calendar: "erro", detail: tokens.error ?? "sem refresh_token" });
  }

  await saveCalendarAccount({
    email: tokens.email ?? "",
    oauthRefreshToken: tokens.refreshToken,
    status: "connected",
    lastError: null,
    connectedAt: new Date().toISOString(),
  });

  const res = back({ calendar: "conectado" });
  res.cookies.delete("beely_calendar_oauth_state");
  return res;
}
