import { NextResponse } from "next/server";
import { stopSession } from "@/lib/wa-lite/session-manager";

export const dynamic = "force-dynamic";

/** POST { sdrId } — desconexão manual (logout real, limpa a sessão salva). */
export async function POST(request: Request) {
  let body: { sdrId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const sdrId = body.sdrId;
  if (!sdrId) return NextResponse.json({ error: "sdrId é obrigatório" }, { status: 400 });

  try {
    await stopSession(sdrId);
  } catch (e) {
    console.error("[api/sdrs/wa-lite/disconnect] falhou:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
