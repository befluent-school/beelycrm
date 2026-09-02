import { NextResponse } from "next/server";
import { getCallProvider } from "@/lib/calls";
import {
  getCallLog, getCallLogByProviderId, updateCallLog, bumpCallCampaignStats,
} from "@/lib/calls/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/calls/webhook
 * Server URL configurado no assistant/número da Vapi. Normaliza o evento e
 * atualiza o call_logs correspondente (status, duração, custo, transcrição, resumo).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true, ignored: "corpo vazio" });

  // Vapi é o provedor padrão; a validação de segredo acontece dentro do parseWebhook.
  const provider = getCallProvider("vapi");
  const event = provider.parseWebhook(body, request.headers);
  if (!event) return NextResponse.json({ ok: true, ignored: "evento não mapeado" });

  // Localiza o log: por metadata.callLogId (mais confiável) ou pelo providerCallId.
  const logId = event.metadata?.callLogId;
  const log = logId ? await getCallLog(logId) : await getCallLogByProviderId(event.providerCallId);
  if (!log) return NextResponse.json({ ok: true, ignored: "call_log não encontrado" });

  const wasCompleted = log.status === "completed";

  await updateCallLog(log.id, {
    providerCallId: event.providerCallId || log.providerCallId,
    status: event.status,
    durationSec: event.durationSec ?? log.durationSec,
    costCents: event.costCents ?? log.costCents,
    recordingUrl: event.recordingUrl ?? log.recordingUrl,
    transcript: event.transcript ?? log.transcript,
    summary: event.summary ?? log.summary,
    endedReason: event.endedReason ?? log.endedReason,
    startedAt: event.startedAt ?? log.startedAt,
    endedAt: event.endedAt ?? log.endedAt,
  });

  // Atualiza agregados da campanha ao concluir.
  if (log.campaignId && event.status === "completed" && !wasCompleted) {
    await bumpCallCampaignStats(log.campaignId, {
      answered: 1,
      completed: 1,
      totalDurationSec: event.durationSec ?? 0,
      totalCostCents: event.costCents ?? 0,
    });
  } else if (log.campaignId && (event.status === "no_answer" || event.status === "voicemail")) {
    await bumpCallCampaignStats(log.campaignId, {});
  }

  return NextResponse.json({ ok: true, status: event.status });
}

/** GET usado só para o "Ping" de verificação de alguns painéis. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "beely-calls-webhook" });
}
