import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic auth check (Next 16 Proxy, formerly Middleware).
 * Protects app routes by checking for a session cookie. Full session
 * validation happens server-side in the app layout.
 */
const PROTECTED = [
  "/dashboard",
  "/contatos",
  "/empresas",
  "/pipeline",
  "/inbox",
  "/atividades",
  "/automacoes",
  "/relatorios",
  "/configuracoes",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!needsAuth) return NextResponse.next();

  const hasDemoSession = request.cookies.has("beely_session");
  const hasSupabaseSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  if (!hasDemoSession && !hasSupabaseSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|auth).*)"],
};
