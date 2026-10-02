import { NextResponse } from "next/server";

/**
 * Gate de acesso para rotas /api/debug/* — hoje completamente abertas, sem
 * nenhuma autenticação (proxy.ts só protege rotas de página, nunca /api).
 * Essas rotas expõem contagem de linhas de tabelas, testam INSERT/DELETE
 * reais, e no caso de zapi-status até devolvem o instanceId e metadados do
 * token do WhatsApp — qualquer pessoa na internet podia acessar.
 *
 * Exige o header x-debug-secret batendo com DEBUG_ADMIN_SECRET. Sem a env
 * var configurada, a rota vira 404 (fail-closed) em vez de aberta.
 */
export function debugGateOrResponse(request: Request): NextResponse | null {
  const required = process.env.DEBUG_ADMIN_SECRET;
  if (!required) {
    // Sem segredo configurado, nega por padrão — nunca abre a rota "de graça".
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const provided = request.headers.get("x-debug-secret");
  if (provided !== required) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return null;
}
