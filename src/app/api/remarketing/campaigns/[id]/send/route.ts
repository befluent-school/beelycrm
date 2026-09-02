import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { renderTemplate } from "@/lib/followup-store";
import { getEmailProvider, emailProviderUnavailableReason } from "@/lib/email";
import {
  getCampaign, saveCampaign, listTemplates,
  createSend, updateSend, bumpCampaignStat,
} from "@/lib/email/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
export const maxDuration = 60;

interface Recipient {
  contactId?: string;
  name?: string;
  email: string;
}

/**
 * POST /api/remarketing/campaigns/:id/send
 * body: { recipients: [{ email, name?, contactId? }], test?: boolean }
 *
 * Envia o template da campanha para cada destinatário via o provedor ativo
 * (Gmail API por padrão). Cria um email_sends por destinatário, injeta pixel
 * de abertura e reescreve links para rastreio de clique.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const campaign = await getCampaign(id);
  if (!campaign) return NextResponse.json({ error: "campanha não encontrada" }, { status: 404 });

  const provider = await getEmailProvider();
  if (!provider) {
    return NextResponse.json({ error: emailProviderUnavailableReason() }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const recipients: Recipient[] = Array.isArray(body.recipients)
    ? body.recipients.filter((r: Recipient) => r && typeof r.email === "string" && r.email.includes("@"))
    : [];
  if (recipients.length === 0) {
    return NextResponse.json({ error: "Informe ao menos um destinatário com e-mail válido." }, { status: 400 });
  }

  const templates = await listTemplates();
  const template = templates.find((t) => t.id === campaign.templateId);
  if (!template) {
    return NextResponse.json({ error: "A campanha não tem um template válido associado." }, { status: 400 });
  }

  const isTest = !!body.test;
  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const r of recipients) {
    const firstName = (r.name ?? "").trim().split(/\s+/)[0] || "";
    const vars = { primeiroNome: firstName, nome: r.name ?? "", email: r.email };
    const subject = renderTemplate(template.subject, vars);

    const send = await createSend({
      campaignId: isTest ? null : campaign.id,
      contactId: r.contactId ?? null,
      toEmail: r.email,
      status: "queued",
    });

    const trackingBase = env.appUrl.replace(/\/$/, "");
    const pixel = `<img src="${trackingBase}/api/remarketing/track/open?s=${send.id}" width="1" height="1" alt="" style="display:none" />`;
    const html = rewriteLinksForTracking(renderTemplate(template.bodyHtml, vars), send.id, trackingBase) + pixel;
    const text = template.bodyText ? renderTemplate(template.bodyText, vars) : undefined;

    const res = await provider.sendEmail({
      to: r.email,
      toName: r.name,
      subject,
      html,
      text,
      headers: { "X-Beely-Send-Id": send.id },
    });

    await updateSend(send.id, {
      status: res.ok ? "sent" : "failed",
      providerMessageId: res.id,
      error: res.error,
      sentAt: res.ok ? new Date().toISOString() : undefined,
    });

    if (!isTest) {
      await bumpCampaignStat(campaign.id, res.ok ? "sent" : "failed");
    }
    results.push({ email: r.email, ok: res.ok, error: res.error });
  }

  if (!isTest) {
    const sent = results.filter((r) => r.ok).length;
    await saveCampaign({ ...campaign, status: sent > 0 ? "done" : campaign.status });
  }

  return NextResponse.json({
    ok: true,
    provider: provider.name,
    processed: results.length,
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}

/** Reescreve href="..." para passar pelo redirecionador de clique. */
function rewriteLinksForTracking(html: string, sendId: string, base: string): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/gi, (_m, url) => {
    const tracked = `${base}/api/remarketing/track/click?s=${sendId}&u=${encodeURIComponent(url)}`;
    return `href="${tracked}"`;
  });
}
