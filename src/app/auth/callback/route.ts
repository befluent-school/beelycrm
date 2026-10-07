import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { exchangeGoogleCode } from "@/lib/auth/google";
import { signInWithGoogle } from "@/lib/auth/service";
import { setSessionCookie } from "@/lib/auth/session";
import { safeEqual } from "@/lib/auth/tokens";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "beely_google_oauth_state";

/** Callback do login com Google — troca o code pelo id_token, verifica a assinatura e cria a sessão própria. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const next = searchParams.get("next") ?? "/dashboard";
  const err = searchParams.get("error");

  const base = env.appUrl || origin;
  const fail = (reason: string) => {
    console.error("[auth/callback] falhou:", reason);
    return NextResponse.redirect(`${base}/login?error=google`);
  };

  if (err) return fail(err);
  if (!code) return fail("code ausente");

  const cookieState = request.headers.get("cookie")
    ?.split(";").map((c) => c.trim())
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))?.split("=")[1];
  if (!cookieState || !state || !safeEqual(cookieState, state)) {
    return fail("state inválido (possível CSRF)");
  }

  const identity = await exchangeGoogleCode(code);
  if (!identity) return fail("não foi possível verificar a identidade Google");

  const result = await signInWithGoogle(identity.sub, identity.email, identity.name);
  if (!result.ok || !result.token) return fail(result.error ?? "falha ao criar sessão");

  await setSessionCookie(result.token);

  const res = NextResponse.redirect(`${base}${next}`);
  res.cookies.delete(STATE_COOKIE);
  return res;
}
