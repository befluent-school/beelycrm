import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Proxy (Next 16 equivalent of Middleware).
 * 1. Atualiza cookies de sessão Supabase em cada request (necessário para OAuth no mobile)
 * 2. Protege rotas autenticadas
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  // Atualiza cookies de sessão Supabase (necessário para Google OAuth funcionar no mobile)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });
    // Refresh do token sem bloquear — erros ignorados (modo demo sem Supabase)
    await supabase.auth.getUser().catch(() => null);
  }

  // Proteção de rotas
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!needsAuth) return response;

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

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|auth).*)"],
};
