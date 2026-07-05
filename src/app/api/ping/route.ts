/**
 * GET /api/ping — keep-alive para o Render free tier não hibernar.
 * O Z-API webhook falha quando o Render está dormindo (timeout na inicialização).
 * O frontend chama este endpoint a cada 10 minutos para manter o serviço ativo.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
