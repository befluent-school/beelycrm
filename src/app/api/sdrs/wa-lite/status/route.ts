import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSessionStatus } from "@/lib/wa-lite/session-manager";

export const dynamic = "force-dynamic";

/**
 * GET ?sdrId=... — status da sessão WA Lite (polling do modal de conexão).
 * Converte a string de QR do Baileys em PNG data-URL aqui, pra o client só
 * renderizar <img>, sem precisar de lib de QR no navegador.
 */
export async function GET(request: Request) {
  const sdrId = new URL(request.url).searchParams.get("sdrId");
  if (!sdrId) return NextResponse.json({ error: "sdrId é obrigatório" }, { status: 400 });

  const { status, qr, phone } = getSessionStatus(sdrId);

  let qrDataUrl: string | undefined;
  if (qr) {
    try {
      qrDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 1 });
    } catch (e) {
      console.error("[api/sdrs/wa-lite/status] falha ao gerar QR:", e);
    }
  }

  return NextResponse.json({ status, qrDataUrl, phone });
}
