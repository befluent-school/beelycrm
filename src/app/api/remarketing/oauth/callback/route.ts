import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { exchangeCodeForTokens } from "@/lib/email";
import { saveEmailAccount } from "@/lib/email/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/remarketing/oauth/callback?code=...&state=...
 * Troca o code por refresh token e persiste a conta de envio Gmail.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const err = searchParams.get("error");

  const back = (params: Record<string, string>) => {
    const u = new URL("/remarketing", env.appUrl);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return NextResponse.redirect(u);
  };

  if (err) return back({ gmail: "erro", detail: err });
  if (!code) return back({ gmail: "erro", detail: "code ausente" });

  // Confere o state anti-CSRF.
  const cookieState = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("beely_gmail_oauth_state="))
    ?.split("=")[1];
  if (cookieState && state && cookieState !== state) {
    return back({ gmail: "erro", detail: "state inválido" });
  }

  const tokens = await exchangeCodeForTokens(code);
  if (tokens.error || !tokens.refreshToken) {
    // Sem refresh token normalmente = usuário já havia autorizado antes.
    // prompt=consent no /start força a reemissão; se ainda faltar, orientar reconectar.
    await saveEmailAccount({
      provider: "gmail",
      fromEmail: env.remarketingFromEmail,
      fromName: env.remarketingFromName,
      status: "error",
      lastError: tokens.error ?? "Google não retornou refresh_token. Revogue o acesso em myaccount.google.com/permissions e reconecte.",
    });
    return back({ gmail: "erro", detail: tokens.error ?? "sem refresh_token" });
  }

  await saveEmailAccount({
    provider: "gmail",
    fromEmail: env.remarketingFromEmail,
    fromName: env.remarketingFromName,
    oauthRefreshToken: tokens.refreshToken,
    status: "connected",
    lastError: null,
    connectedAt: new Date().toISOString(),
  });

  const res = back({ gmail: "conectado" });
  res.cookies.delete("beely_gmail_oauth_state");
  return res;
}
