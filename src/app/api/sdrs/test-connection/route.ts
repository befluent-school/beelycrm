import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/sdrs/test-connection
 * Body: { waProvider, zapiInstanceId?, zapiToken?, zapiClientToken?,
 *         metaPhoneNumberId?, metaAccessToken? }
 *
 * Testa a credencial do provedor de WhatsApp ANTES de salvar o SDR, batendo
 * direto na API do provedor (status da instância Z-API, ou GET do número na
 * Meta Graph API). Existe porque credenciais erradas/expiradas eram salvas
 * sem aviso nenhum — o SDR "existia" no Beely mas nenhuma mensagem chegava,
 * sem nenhum erro visível em lugar nenhum.
 */
export async function POST(request: Request) {
  let body: {
    waProvider?: "zapi" | "meta_cloud";
    zapiInstanceId?: string; zapiToken?: string; zapiClientToken?: string;
    metaPhoneNumberId?: string; metaAccessToken?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (body.waProvider === "meta_cloud") {
    const { metaPhoneNumberId, metaAccessToken } = body;
    if (!metaPhoneNumberId || !metaAccessToken) {
      return NextResponse.json({ ok: false, error: "Informe Phone Number ID e Access Token." });
    }
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${metaPhoneNumberId}?fields=display_phone_number,verified_name`, {
        headers: { Authorization: `Bearer ${metaAccessToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: data?.error?.message ?? `HTTP ${res.status}` });
      }
      return NextResponse.json({
        ok: true,
        detail: `Conectado: ${data.display_phone_number ?? metaPhoneNumberId} (${data.verified_name ?? "sem nome verificado"})`,
      });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  // Z-API (default)
  const { zapiInstanceId, zapiToken, zapiClientToken } = body;
  if (!zapiInstanceId || !zapiToken) {
    return NextResponse.json({ ok: false, error: "Informe Instance ID e Token." });
  }
  try {
    const headers: Record<string, string> = {};
    if (zapiClientToken) headers["Client-Token"] = zapiClientToken;
    const res = await fetch(
      `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiToken}/status`,
      { headers }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: data?.error ?? data?.message ?? `HTTP ${res.status}` });
    }
    // A Z-API responde 200 mesmo com instância desconectada — checar o campo connected.
    if (data.connected === false) {
      return NextResponse.json({
        ok: false,
        error: "Instância existe, mas o WhatsApp não está conectado (escaneie o QR Code no painel Z-API).",
      });
    }
    return NextResponse.json({ ok: true, detail: `Instância conectada${data.smartphoneConnected === false ? " (celular offline)" : ""}.` });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}
