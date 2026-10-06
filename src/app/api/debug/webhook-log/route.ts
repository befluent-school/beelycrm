/**
 * Debug de webhooks — salva payloads no Postgres.
 * GET  /api/debug/webhook-log   → últimos 20 payloads recebidos
 * POST /api/debug/webhook-log   → salva payload (use como URL de debug no Z-API)
 * DELETE /api/debug/webhook-log → limpa entradas antigas
 */

import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db as client, schema } from "@/db";
import { debugGateOrResponse } from "@/lib/debug-gate";

export const dynamic = "force-dynamic";

/** Salva um payload no log de debug — chamado tanto por esta rota quanto
 * diretamente pelo webhook real de produção (/api/webhooks/[provider]),
 * para que todo evento recebido fique visível em /debug sem precisar
 * duplicar a URL de webhook no painel da Z-API. */
export async function logWebhookPayload(body: unknown, headers: Record<string, string> = {}) {
  if (!client) return;
  try {
    await client.insert(schema.webhookDebugLog).values({
      ts: new Date().toISOString(),
      headers: JSON.stringify(headers),
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("[debug-webhook] erro ao salvar:", e);
  }
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

export async function GET(request: Request) {
  const gated = debugGateOrResponse(request);
  if (gated) return gated;

  if (!client) {
    return NextResponse.json({ error: "db_not_configured" }, { status: 500 });
  }

  const rows = await client.select({ id: schema.webhookDebugLog.id, ts: schema.webhookDebugLog.ts, body: schema.webhookDebugLog.body })
    .from(schema.webhookDebugLog)
    .orderBy(desc(schema.webhookDebugLog.createdAt))
    .limit(20);

  const entries = rows.map((r) => {
    let body: unknown = r.body;
    try { body = JSON.parse(r.body ?? "null"); } catch { /* mantém string */ }
    return { id: r.id, ts: r.ts, body };
  });

  return NextResponse.json({ count: entries.length, entries });
}

export async function DELETE(request: Request) {
  const gated = debugGateOrResponse(request);
  if (gated) return gated;

  if (client) {
    await client.delete(schema.webhookDebugLog).where(sql`true`);
  }
  return NextResponse.json({ cleared: true });
}
