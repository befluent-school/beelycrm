/**
 * Debug de webhooks — salva payloads no Supabase (persiste no Render free tier).
 * GET  /api/debug/webhook-log   → últimos 20 payloads recebidos
 * POST /api/debug/webhook-log   → salva payload (use como URL de debug no Z-API)
 * DELETE /api/debug/webhook-log → limpa entradas antigas
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Salva um payload no log de debug — chamado tanto por esta rota quanto
 * diretamente pelo webhook real de produção (/api/webhooks/[provider]),
 * para que todo evento recebido fique visível em /debug sem precisar
 * duplicar a URL de webhook no painel da Z-API. */
export async function logWebhookPayload(body: unknown, headers: Record<string, string> = {}) {
  const ts = new Date().toISOString();
  const client = getClient();
  if (!client) return;
  try {
    await client.rpc("exec_sql", {
      sql: `CREATE TABLE IF NOT EXISTS webhook_debug_log (
        id BIGSERIAL PRIMARY KEY,
        ts TEXT,
        headers TEXT,
        body TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    });
  } catch { /* tabela pode já existir */ }

  const { error } = await client.from("webhook_debug_log").insert({
    ts,
    headers: JSON.stringify(headers),
    body:    JSON.stringify(body),
  });
  if (error) console.error("[debug-webhook] erro Supabase:", error.message);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { body = rawBody; }

  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k] = v; });

  await logWebhookPayload(body, headers);

  return NextResponse.json({ received: true, ts: new Date().toISOString() });
}

export async function GET() {
  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }

  // Garante que a tabela existe
  try {
    await client.rpc("exec_sql", {
      sql: `CREATE TABLE IF NOT EXISTS webhook_debug_log (
        id BIGSERIAL PRIMARY KEY,
        ts TEXT,
        headers TEXT,
        body TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    });
  } catch { /* tabela pode já existir */ }

  const { data, error } = await client
    .from("webhook_debug_log")
    .select("id, ts, body")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries = (data ?? []).map((r: any) => {
    let body: unknown = r.body;
    try { body = JSON.parse(r.body); } catch { /* mantém string */ }
    return { id: r.id, ts: r.ts, body };
  });

  return NextResponse.json({ count: entries.length, entries });
}

export async function DELETE() {
  const client = getClient();
  if (client) {
    await client.from("webhook_debug_log").delete().neq("id", 0);
  }
  return NextResponse.json({ cleared: true });
}
