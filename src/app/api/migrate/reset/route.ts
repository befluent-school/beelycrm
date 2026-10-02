import { NextResponse } from "next/server";
import { debugGateOrResponse } from "@/lib/debug-gate";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  // Hoje é um no-op (só sinaliza ao cliente para remover o flag local e
  // re-migrar) — gateado mesmo assim por defesa em profundidade, já que é
  // o tipo de endpoint que poderia virar perigoso numa mudança futura.
  const gated = debugGateOrResponse(request);
  if (gated) return gated;
  return NextResponse.json({ ok: true, action: "clear_migration_flag" });
}
