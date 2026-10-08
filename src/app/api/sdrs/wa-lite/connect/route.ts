import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db as client, schema } from "@/db";
import { startSession } from "@/lib/wa-lite/session-manager";

export const dynamic = "force-dynamic";

/** POST { sdrId } — inicia (ou reusa, se já em andamento) a sessão WA Lite do SDR. */
export async function POST(request: Request) {
  if (!client) return NextResponse.json({ error: "db_not_configured" }, { status: 500 });

  let body: { sdrId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const sdrId = body.sdrId;
  if (!sdrId) return NextResponse.json({ error: "sdrId é obrigatório" }, { status: 400 });

  const rows = await client.select({ id: schema.sdrs.id }).from(schema.sdrs).where(eq(schema.sdrs.id, sdrId)).limit(1);
  if (rows.length === 0) return NextResponse.json({ error: "SDR não encontrado" }, { status: 404 });

  try {
    await startSession(sdrId);
  } catch (e) {
    console.error("[api/sdrs/wa-lite/connect] falhou:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
