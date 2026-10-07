import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { env } from "@/lib/env";
import { buildGoogleLoginUrl, googleLoginEnabled } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "beely_google_oauth_state";

/** GET /auth/google/start — inicia o login com Google (state anti-CSRF em cookie httpOnly). */
export async function GET(request: Request) {
  if (!googleLoginEnabled()) {
    return NextResponse.json({ error: "Login com Google não configurado (GOOGLE_LOGIN_CLIENT_ID/SECRET ausentes)." }, { status: 400 });
  }

  const state = randomBytes(24).toString("base64url");
  const url = buildGoogleLoginUrl(state);

  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: env.appUrl.startsWith("https"),
  });
  return res;
}
