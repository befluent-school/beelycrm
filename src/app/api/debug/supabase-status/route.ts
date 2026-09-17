import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/supabase-status
 *
 * Diagnóstico real de persistência. Dois bugs distintos já passaram por
 * aqui:
 * 1. db.ts/message-store.ts engolindo todo erro do Supabase silenciosamente
 *    (void upsert, sem log, sem retorno à UI).
 * 2. RLS (Row Level Security) ligado numa tabela nova (ex.: sdrs) sem
 *    nenhuma policy — a escrita do NAVEGADOR (anon key, é assim que o CRM
 *    inteiro sempre mutou dados) fica bloqueada silenciosamente, mesmo a
 *    tabela existindo e sendo legível pela service role (por isso o
 *    diagnóstico com service role sozinho não pegava esse caso).
 *
 * Esta rota testa, com erro explícito:
 * 1. Se as env vars de Supabase (service role + anon) estão configuradas.
 * 2. Se a função RPC exec_sql existe (usada para criar tabelas automaticamente
 *    em runtime — se ausente, TODO o auto-schema do app falha silenciosamente).
 * 3. Se as tabelas essenciais existem e são legíveis (via service role).
 * 4. Se a ANON KEY consegue de fato INSERIR na tabela sdrs — o mesmo caminho
 *    que o navegador usa. Se falhar aqui, é RLS bloqueando (rode
 *    supabase-setup.sql, seção 7).
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
    anonWrite: { ok: boolean; error?: string; hint?: string };
    anonWriteByTable: Record<string, { ok: boolean; error?: string }>;
  } = {
    ok: true,
    execSql: { available: false },
    tables: {},
    anonWrite: { ok: false },
    anonWriteByTable: {},
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

  // 2. Testa leitura/existência de cada tabela essencial (via service role).
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

  // 3. Testa se a ANON KEY (o que o navegador usa de verdade para salvar SDRs,
  // contatos, deals etc.) consegue inserir na tabela sdrs. Insere e remove
  // uma linha de teste — se falhar, é RLS sem policy bloqueando a escrita.
  if (anonKey && result.tables.sdrs?.exists) {
    const anonClient = createClient(url, anonKey);
    const testId = `__diagnostic_${Date.now()}`;
    const { error: insertErr } = await anonClient.from("sdrs").insert({
      id: testId, name: "__diagnostic__", active: false,
    });
    if (insertErr) {
      result.anonWrite = {
        ok: false,
        error: insertErr.message,
        hint: "A tabela sdrs provavelmente tem RLS (Row Level Security) ativo sem nenhuma policy — a escrita do navegador (anon key) é bloqueada mesmo a tabela existindo. Rode a seção 7 de supabase-setup.sql (disable row level security).",
      };
      result.ok = false;
    } else {
      result.anonWrite = { ok: true };
      // Limpa a linha de teste (via service role, sem depender de RLS).
      await supabase.from("sdrs").delete().eq("id", testId);
    }
  }

  // 4. Mesmo teste, mas em contacts/deals — tabelas antigas que nunca
  // passaram pela correção de RLS da seção 7 (supabase-setup.sql), porque
  // eram assumidas como "sem RLS" por serem anteriores ao Inbox multi-SDR.
  // Se a importação de leads "aparece e some", é RLS bloqueando aqui.
  if (anonKey) {
    const anonClient = createClient(url, anonKey);

    if (result.tables.contacts?.exists) {
      const testId = `__diagnostic_contact_${Date.now()}`;
      const { error } = await anonClient.from("contacts").insert({ id: testId, name: "__diagnostic__", score: 0, tags: [] });
      if (error) {
        result.anonWriteByTable.contacts = { ok: false, error: error.message };
        result.ok = false;
      } else {
        result.anonWriteByTable.contacts = { ok: true };
        await supabase.from("contacts").delete().eq("id", testId);
      }
    }

    if (result.tables.deals?.exists) {
      const testId = `__diagnostic_deal_${Date.now()}`;
      const { error } = await anonClient.from("deals").insert({
        id: testId, title: "__diagnostic__", value: 0, pipeline_id: "__diagnostic__", stage_id: "__diagnostic__", contact: "__diagnostic__", owner: "__diagnostic__",
      });
      if (error) {
        result.anonWriteByTable.deals = { ok: false, error: error.message };
        result.ok = false;
      } else {
        result.anonWriteByTable.deals = { ok: true };
        await supabase.from("deals").delete().eq("id", testId);
      }
    }
  }

  return NextResponse.json(result);
}
