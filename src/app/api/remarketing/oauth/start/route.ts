import { NextResponse } from "next/server";
import { env, HAS_GMAIL_OAUTH } from "@/lib/env";
import { buildGmailAuthUrl } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * GET /api/remarketing/oauth/start
 * Redireciona para o consentimento OAuth do Google (escopo gmail.send).
 * O usuário volta em /api/remarketing/oauth/callback.
 */
export async function GET() {
  if (!HAS_GMAIL_OAUTH) {
    return NextResponse.json(
      {
        error:
          "GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET ausentes. Configure no ambiente e defina o redirect URI para /api/remarketing/oauth/callback.",
      },
      { status: 400 }
    );
  }

  // state simples anti-CSRF, guardado em cookie e conferido no callback.
  const state = crypto.randomUUID();
  const url = buildGmailAuthUrl(state);

  const res = NextResponse.redirect(url);
  res.cookies.set("beely_gmail_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: env.appUrl.startsWith("https"),
  });
  return res;
}
