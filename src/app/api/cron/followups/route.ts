import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTemplates, logFollowupSent, renderTemplate } from "@/lib/followup-store";
import { pushMessage } from "@/lib/message-store";

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
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret") ?? request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }
  const supabase = createClient(url, key);

  const [{ data: deals, error: dealsErr }, { data: pipelines }, { data: contacts }] = await Promise.all([
    supabase.from("deals").select("*").eq("status", "open"),
    supabase.from("pipelines").select("*"),
    supabase.from("contacts").select("id, name, phone, email"),
  ]);

  if (dealsErr) return NextResponse.json({ error: dealsErr.message }, { status: 500 });

  const templates = await getTemplates();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contactByName = new Map((contacts ?? []).map((c: any) => [c.name, c]));

  const FOLLOWUP_RE = /follow[\s-]?up\s*([1-5])/i;

  const results: { dealId: string; contact: string; step: number; action: string }[] = [];
  const todayKey = new Date().toISOString().slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const deal of (deals ?? []) as any[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipeline = (pipelines ?? []).find((p: any) => p.id === deal.pipeline_id);
    if (!pipeline) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stage = (pipeline.stages ?? []).find((s: any) => s.id === deal.stage_id);
    if (!stage) continue;

    const match = FOLLOWUP_RE.exec(stage.name ?? "");
    if (!match) continue;
    const step = Number(match[1]);

    // Evita disparo duplicado no mesmo dia (verifica log)
    const { data: alreadySent } = await supabase
      .from("followup_log")
      .select("id")
      .eq("deal_id", deal.id)
      .eq("step", step)
      .gte("sent_at", `${todayKey}T00:00:00Z`)
      .limit(1);
    if (alreadySent && alreadySent.length > 0) continue;

    const template = templates.find((t) => t.step === step);
    if (!template) continue;

    const contact = contactByName.get(deal.contact);
    const phone = contact?.phone ?? "";
    const firstName = String(deal.contact ?? "").split(" ")[0] || "tudo bem?";
    const text = renderTemplate(template.message, { primeiroNome: firstName });

    let ok = false;
    if (template.channel === "whatsapp" && phone) {
      ok = await sendWhatsApp(phone, text, deal.contact);
    } else if (template.channel === "email" && contact?.email) {
      ok = await sendEmail(contact.email, template.subject ?? "Continuando nosso papo", text);
    }

    await logFollowupSent(deal.id, step, template.channel, ok);

    // Avança etapa ou descarta se já era a última
    if (step >= 5) {
      await supabase.from("deals").update({
        status: "lost",
        lost_reason: "Sem resposta após 5 follow-ups",
        history: [...(deal.history ?? []), { ts: new Date().toISOString(), text: "Descartado automaticamente — 5 follow-ups sem resposta" }],
      }).eq("id", deal.id);
      results.push({ dealId: deal.id, contact: deal.contact, step, action: "descartado" });
    } else {
      const nextStageName = stage.name.replace(/([1-5])/, String(step + 1));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nextStage = (pipeline.stages ?? []).find((s: any) => s.name.toLowerCase() === nextStageName.toLowerCase());
      if (nextStage) {
        await supabase.from("deals").update({
          stage_id: nextStage.id,
          stage_entered_at: new Date().toISOString(),
          history: [...(deal.history ?? []), { ts: new Date().toISOString(), text: `Follow-up ${step} enviado sem resposta anterior — avançado para ${nextStage.name}` }],
        }).eq("id", deal.id);
        results.push({ dealId: deal.id, contact: deal.contact, step, action: `avançado para follow-up ${step + 1}` });
      } else {
        results.push({ dealId: deal.id, contact: deal.contact, step, action: "mensagem enviada (próxima etapa não encontrada)" });
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
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "no-reply@befluent.com.br";
  if (!apiKey) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text: body }),
    });
    return res.ok;
  } catch (e) {
    console.error("[cron/followups] erro Resend:", e);
    return false;
  }
}
