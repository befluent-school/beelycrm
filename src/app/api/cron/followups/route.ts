import { NextResponse } from "next/server";
import { and, eq, gte } from "drizzle-orm";
import { db as client, schema } from "@/db";
import { getTemplates, logFollowupSent, renderTemplate } from "@/lib/followup-store";
import { pushMessage } from "@/lib/message-store";
import { getEmailProvider } from "@/lib/email";
import { cronGateOrResponse } from "@/lib/cron-gate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/followups
 * Disparado manualmente pelo botão "Disparar follow-ups de hoje" em
 * Automações → Follow-up. Também pode ser agendado externamente
 * (Render Cron Job, cron-job.org etc) se preferir automação total.
 *
 * Regra:
 * - Lead aberto numa etapa "Follow-up N" (N=1..5) recebe a mensagem do dia.
 * - Se já recebeu follow-up hoje, pula (evita duplicar em re-execuções).
 * - Após enviar, avança para "Follow-up N+1".
 * - Se estava no Follow-up 5, é descartado (status=lost) em vez de avançar.
 * - Protegido por CRON_SECRET (query ?secret= ou header x-cron-secret) apenas
 *   se a env var estiver definida — o botão manual não precisa dela.
 */
export async function GET(request: Request) {
  const gated = cronGateOrResponse(request);
  if (gated) return gated;

  if (!client) {
    return NextResponse.json({ error: "db_not_configured" }, { status: 500 });
  }

  const [deals, pipelines, contacts] = await Promise.all([
    client.select().from(schema.deals).where(eq(schema.deals.status, "open")),
    client.select().from(schema.pipelines),
    client.select({ id: schema.contacts.id, name: schema.contacts.name, phone: schema.contacts.phone, email: schema.contacts.email }).from(schema.contacts),
  ]);

  const templates = await getTemplates();
  const contactByName = new Map(contacts.map((c) => [c.name, c]));

  const FOLLOWUP_RE = /follow[\s-]?up\s*([1-5])/i;

  const results: { dealId: string; contact: string; step: number; action: string }[] = [];
  const todayStart = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

  for (const deal of deals) {
    const pipeline = pipelines.find((p) => p.id === deal.pipelineId);
    if (!pipeline) continue;
    const stage = (pipeline.stages ?? []).find((s) => s.id === deal.stageId);
    if (!stage) continue;

    const match = FOLLOWUP_RE.exec(stage.name ?? "");
    if (!match) continue;
    const step = Number(match[1]);

    // Evita disparo duplicado no mesmo dia (verifica log)
    const alreadySent = await client.select({ id: schema.followupLog.id }).from(schema.followupLog)
      .where(and(
        eq(schema.followupLog.dealId, deal.id),
        eq(schema.followupLog.step, step),
        gte(schema.followupLog.sentAt, todayStart),
      ))
      .limit(1);
    if (alreadySent.length > 0) continue;

    const template = templates.find((t) => t.step === step);
    if (!template) continue;

    const contact = contactByName.get(deal.contact ?? "");
    const phone = contact?.phone ?? "";
    const firstName = String(deal.contact ?? "").split(" ")[0] || "tudo bem?";
    const text = renderTemplate(template.message, { primeiroNome: firstName });

    let ok = false;
    if (template.channel === "whatsapp" && phone) {
      ok = await sendWhatsApp(phone, text, deal.contact ?? "");
    } else if (template.channel === "email" && contact?.email) {
      ok = await sendEmail(contact.email, template.subject ?? "Continuando nosso papo", text);
    }

    await logFollowupSent(deal.id, step, template.channel, ok);

    // Avança etapa ou descarta se já era a última
    if (step >= 5) {
      await client.update(schema.deals).set({
        status: "lost",
        lostReason: "Sem resposta após 5 follow-ups",
        history: [...(deal.history ?? []), { ts: new Date().toISOString(), text: "Descartado automaticamente — 5 follow-ups sem resposta" }],
      }).where(eq(schema.deals.id, deal.id));
      results.push({ dealId: deal.id, contact: deal.contact ?? "", step, action: "descartado" });
    } else {
      const nextStageName = stage.name.replace(/([1-5])/, String(step + 1));
      const nextStage = (pipeline.stages ?? []).find((s) => s.name.toLowerCase() === nextStageName.toLowerCase());
      if (nextStage) {
        await client.update(schema.deals).set({
          stageId: nextStage.id,
          stageEnteredAt: new Date(),
          history: [...(deal.history ?? []), { ts: new Date().toISOString(), text: `Follow-up ${step} enviado sem resposta anterior — avançado para ${nextStage.name}` }],
        }).where(eq(schema.deals.id, deal.id));
        results.push({ dealId: deal.id, contact: deal.contact ?? "", step, action: `avançado para follow-up ${step + 1}` });
      } else {
        results.push({ dealId: deal.id, contact: deal.contact ?? "", step, action: "mensagem enviada (próxima etapa não encontrada)" });
      }
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

async function sendWhatsApp(phone: string, text: string, contactName: string): Promise<boolean> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;
  const phoneClean = phone.replace(/\D/g, "");
  if (!instanceId || !token || !phoneClean) return false;

  let ok = false;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (clientToken) headers["Client-Token"] = clientToken;
    const res = await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`, {
      method: "POST", headers, body: JSON.stringify({ phone: phoneClean, message: text }),
    });
    ok = res.ok;
  } catch (e) {
    console.error("[cron/followups] erro Z-API:", e);
  }

  await pushMessage({
    channel: "whatsapp", from: phoneClean, fromName: contactName,
    text, timestamp: Date.now(), fromMe: true, msgType: "text",
  });

  return ok;
}

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  // Usa o provedor de e-mail ativo do Beely (Gmail API por padrão, Resend como fallback).
  const provider = await getEmailProvider();
  if (!provider) return false;
  try {
    const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.6;white-space:pre-wrap">${escapeHtml(body)}</div>`;
    const res = await provider.sendEmail({ to, subject, html, text: body });
    return res.ok;
  } catch (e) {
    console.error("[cron/followups] erro ao enviar e-mail:", e);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
