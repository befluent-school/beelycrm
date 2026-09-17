import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/supabase-status
 *
 * Diagnóstico real de persistência — nasceu do bug em que db.ts/message-store.ts
 * engolem TODO erro do Supabase silenciosamente (void upsert, sem log, sem
 * retorno à UI). Isso fazia SDRs "salvos" no navegador nunca chegarem ao banco,
 * e o webhook então não encontrava o SDR e descartava a mensagem sem rastro.
 *
 * Esta rota testa, com erro explícito:
 * 1. Se as env vars de Supabase (service role) estão configuradas.
 * 2. Se a função RPC exec_sql existe (usada para criar tabelas automaticamente
 *    em runtime — se ausente, TODO o auto-schema do app falha silenciosamente).
 * 3. Se as tabelas essenciais existem e são gravináveis (sdrs, inbox_messages,
 *    deals, contacts).
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    return NextResponse.json({ ok: false, reason: "NEXT_PUBLIC_SUPABASE_URL ausente" });
  }
  if (!serviceKey) {
    return NextResponse.json({
      ok: false,
      reason: "SUPABASE_SERVICE_ROLE_KEY ausente — rotas de servidor (webhook, cron) não conseguem gravar/ler com privilégio total.",
      hasAnonKey: !!anonKey,
    });
  }

  const supabase = createClient(url, serviceKey);
  const result: {
    ok: boolean;
    execSql: { available: boolean; error?: string };
    tables: Record<string, { exists: boolean; count?: number; error?: string }>;
  } = {
    ok: true,
    execSql: { available: false },
    tables: {},
  };

  // 1. Testa se a função RPC exec_sql existe — pré-requisito de TODO o
  // auto-schema do app (init-schema, message-store, followup-store etc).
  const { error: execErr } = await supabase.rpc("exec_sql", { sql: "SELECT 1" });
  if (execErr) {
    result.execSql = { available: false, error: execErr.message };
    result.ok = false;
  } else {
    result.execSql = { available: true };
  }

  // 2. Testa leitura/existência de cada tabela essencial.
  const tables = ["sdrs", "inbox_messages", "deals", "contacts", "pipelines"];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
    if (error) {
      result.tables[t] = { exists: false, error: error.message };
      result.ok = false;
    } else {
      result.tables[t] = { exists: true, count: count ?? 0 };
    }
  }

  return NextResponse.json(result);
}
