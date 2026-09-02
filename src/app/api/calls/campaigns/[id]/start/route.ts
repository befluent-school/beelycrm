import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCallProvider, callProviderUnavailableReason } from "@/lib/calls";
import {
  getCallCampaign, saveCallCampaign, createCallLog, updateCallLog, bumpCallCampaignStats,
} from "@/lib/calls/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
export const maxDuration = 60;

interface Recipient {
  contactId?: string;
  name?: string;
  phone: string; // E.164 preferencialmente
}

/**
 * POST /api/calls/campaigns/:id/start
 * body: { recipients: [{ phone, name?, contactId? }] }
 *
 * Dispara uma ligação com IA para cada destinatário via o provedor da campanha
 * (Vapi por padrão). Cria um call_logs (status queued) por número; o webhook
 * atualiza status/transcrição/custo depois.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const campaign = await getCallCampaign(id);
  if (!campaign) return NextResponse.json({ error: "campanha não encontrada" }, { status: 404 });

  const reason = callProviderUnavailableReason();
  if (campaign.provider === "vapi" && reason) {
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const recipients: Recipient[] = Array.isArray(body.recipients)
    ? body.recipients.filter((r: Recipient) => r && typeof r.phone === "string" && r.phone.replace(/\D/g, "").length >= 8)
    : [];
  if (recipients.length === 0) {
    return NextResponse.json({ error: "Informe ao menos um número de telefone válido." }, { status: 400 });
  }

  const provider = getCallProvider(campaign.provider);
  const results: { phone: string; ok: boolean; callId?: string; error?: string }[] = [];

  for (const r of recipients) {
    const toNumber = toE164(r.phone);
    const log = await createCallLog({
      campaignId: campaign.id,
      contactId: r.contactId ?? null,
      provider: campaign.provider,
      toNumber,
      status: "queued",
    });

    const res = await provider.startCall({
      toNumber,
      assistant: campaign.assistantConfig,
      metadata: { callLogId: log.id, campaignId: campaign.id, contactId: r.contactId ?? "" },
    });

    if (res.ok) {
      await updateCallLog(log.id, { providerCallId: res.callId, status: "ringing" });
      await bumpCallCampaignStats(campaign.id, { dialed: 1 });
    } else {
      await updateCallLog(log.id, { status: "failed", endedReason: res.error });
      await bumpCallCampaignStats(campaign.id, { dialed: 1, failed: 1 });
    }
    results.push({ phone: toNumber, ok: res.ok, callId: res.callId, error: res.error });
  }

  await saveCallCampaign({ ...campaign, status: "running" });

  return NextResponse.json({
    ok: true,
    provider: provider.name,
    dialed: results.length,
    started: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return `+${digits}`;
  // Heurística BR: 10-11 dígitos → prefixa +55
  if (digits.length >= 10 && digits.length <= 11) return `+55${digits}`;
  return `+${digits}`;
}
