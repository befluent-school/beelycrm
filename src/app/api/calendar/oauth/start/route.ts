import { NextResponse } from "next/server";
import { env, HAS_GMAIL_OAUTH } from "@/lib/env";
import { buildCalendarAuthUrl } from "@/lib/calendar/google";

export const dynamic = "force-dynamic";

/**
 * GET /api/calendar/oauth/start
 * Redireciona para o consentimento OAuth do Google (escopo calendar.events).
 */
export async function GET() {
  if (!HAS_GMAIL_OAUTH) {
    return NextResponse.json(
      {
        error:
          "GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET ausentes. Configure no ambiente e adicione /api/calendar/oauth/callback como redirect URI autorizado no Google Cloud Console.",
      },
      { status: 400 }
    );
  }

  const state = crypto.randomUUID();
  const url = buildCalendarAuthUrl(state);

  const res = NextResponse.redirect(url);
  res.cookies.set("beely_calendar_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: env.appUrl.startsWith("https"),
  });
  return res;
}
