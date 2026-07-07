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

export async function POST(request: Request) {
  const rawBody = await request.text();
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { body = rawBody; }

  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k] = v; });

  const ts = new Date().toISOString();
  console.log("[debug-webhook] payload recebido:", JSON.stringify(body, null, 2));

  const client = getClient();
  if (client) {
    await client.from("webhook_debug_log").insert({
      ts,
      headers: JSON.stringify(headers),
      body:    JSON.stringify(body),
    }).then(({ error }) => {
      if (error) {
        // Tabela pode não existir ainda — tenta criar
        console.error("[debug-webhook] erro Supabase:", error.message);
      }
    });
  }

  return NextResponse.json({ received: true, ts });
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
