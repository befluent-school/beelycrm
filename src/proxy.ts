import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (Next 16 equivalent of Middleware).
 * Protege rotas autenticadas checando só a PRESENÇA do cookie de sessão
 * própria — validação real (existe no banco? não expirou? usuário ativo?)
 * sempre acontece depois, em getCurrentSession() nos Server
 * Components/Actions e nas Route Handlers. Isso aqui é só conveniência de
 * navegação (evita renderizar a página protegida pra depois redirecionar),
 * nunca o limite de segurança de verdade — mesmo princípio do proxy.ts do
 * BeeFlow.
 */
const PROTECTED = [
  "/dashboard",
  "/contatos",
  "/empresas",
  "/pipeline",
  "/inbox",
  "/atividades",
  "/automacoes",
  "/remarketing",
  "/ligacoes",
  "/relatorios",
  "/configuracoes",
  // /debug era público sem nenhuma autenticação — expunha conteúdo real de
  // mensagens de WhatsApp (telefone, texto) e permitia enviar mensagem pelo
  // número do Be Fluent a qualquer visitante que soubesse a URL.
  "/debug",
];

const SESSION_COOKIE = "beely_session_token";
const DEMO_COOKIE = "beely_session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!needsAuth) return NextResponse.next();

  const hasSession = request.cookies.has(SESSION_COOKIE) || request.cookies.has(DEMO_COOKIE);

  if (!hasSession) {
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
