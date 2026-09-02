import { NextResponse } from "next/server";
import { HAS_VAPI } from "@/lib/env";
import { getCallProvider, callProviderUnavailableReason, type AssistantConfig } from "@/lib/calls";
import { createCallLog, updateCallLog } from "@/lib/calls/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/calls/dial
 * body: { phone, name?, contactId?, assistant?: AssistantConfig, campaignId? }
 * Ligação avulsa com IA para um contato (botão "Ligar agora").
 */
export async function POST(request: Request) {
  if (!HAS_VAPI) {
    return NextResponse.json({ error: callProviderUnavailableReason() || "Vapi não configurado" }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));
  const phone = String(body.phone ?? "");
  if (phone.replace(/\D/g, "").length < 8) {
    return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
  }
  const toNumber = toE164(phone);
  const assistant: AssistantConfig | undefined = body.assistant;

  const provider = getCallProvider("vapi");
  const log = await createCallLog({
    campaignId: body.campaignId ?? null,
    contactId: body.contactId ?? null,
    provider: "vapi",
    toNumber,
    status: "queued",
  });

  const res = await provider.startCall({
    toNumber,
    assistant,
    metadata: { callLogId: log.id, contactId: body.contactId ?? "" },
  });

  if (res.ok) {
    await updateCallLog(log.id, { providerCallId: res.callId, status: "ringing" });
    return NextResponse.json({ ok: true, callId: res.callId, logId: log.id });
  }
  await updateCallLog(log.id, { status: "failed", endedReason: res.error });
  return NextResponse.json({ ok: false, error: res.error, logId: log.id }, { status: 502 });
}

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 11) return `+55${digits}`;
  return `+${digits}`;
}
