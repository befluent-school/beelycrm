import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db as client, schema } from "@/db";
import { debugGateOrResponse } from "@/lib/debug-gate";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/supabase-status
 *
 * Diagnóstico de persistência do Postgres (nome da rota mantido por
 * compatibilidade com links/bookmarks antigos — já não fala com Supabase).
 *
 * Testa:
 * 1. Se DATABASE_URL está configurado e a conexão responde.
 * 2. Contagem de linhas nas tabelas essenciais.
 *
 * Os antigos testes de RLS/anon-key/exec_sql não fazem mais sentido: toda
 * escrita agora passa por Route Handlers server-side usando uma única
 * credencial de banco (sem papel anônimo separado nem Row Level Security
 * por padrão), então a classe de bug "RLS bloqueando silenciosamente" que
 * esta rota existia para diagnosticar não existe mais nessa arquitetura.
 */
export async function GET(request: Request) {
  const gated = debugGateOrResponse(request);
  if (gated) return gated;

  if (!client) {
    return NextResponse.json({
      ok: false,
      reason: "DATABASE_URL ausente — nenhuma rota de servidor consegue ler/gravar no banco.",
    });
  }

  const result: {
    ok: boolean;
    connection: { available: boolean; error?: string };
    tables: Record<string, { exists: boolean; count?: number; error?: string }>;
  } = {
    ok: true,
    connection: { available: false },
    tables: {},
  };

  try {
    await client.execute(sql`select 1`);
    result.connection = { available: true };
  } catch (e) {
    result.connection = { available: false, error: e instanceof Error ? e.message : String(e) };
    result.ok = false;
    return NextResponse.json(result);
  }

  const tableChecks: [string, ReturnType<typeof sql>][] = [
    ["sdrs", sql`select count(*)::int as count from ${schema.sdrs}`],
    ["inbox_messages", sql`select count(*)::int as count from ${schema.inboxMessages}`],
    ["deals", sql`select count(*)::int as count from ${schema.deals}`],
    ["contacts", sql`select count(*)::int as count from ${schema.contacts}`],
    ["pipelines", sql`select count(*)::int as count from ${schema.pipelines}`],
  ];

  for (const [name, query] of tableChecks) {
    try {
      const rows = await client.execute(query) as unknown as { count: number }[];
      result.tables[name] = { exists: true, count: rows[0]?.count ?? 0 };
    } catch (e) {
      result.tables[name] = { exists: false, error: e instanceof Error ? e.message : String(e) };
      result.ok = false;
    }
  }

  return NextResponse.json(result);
}
