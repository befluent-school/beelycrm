/**
 * Envio de e-mail transacional via SMTP genérico (Nodemailer) — não um SDK
 * de provedor específico. `.env.example` aponta para o SMTP da Hostinger
 * (smtp.hostinger.com:465) como padrão de produção.
 *
 * Sem SMTP_HOST configurado, não envia nada de verdade — só loga o
 * conteúdo. Isso é aceitável em dev local, nunca em produção (documentado
 * abaixo e no .env.example).
 */
import nodemailer, { type Transporter } from "nodemailer";
import { env, HAS_SMTP } from "@/lib/env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!HAS_SMTP) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });
  }
  return transporter;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(input: SendMailInput): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) {
    // Nunca em produção — ver nota acima. Dev local sem SMTP configurado
    // só precisa ver o conteúdo pra testar o fluxo, não enviar de verdade.
    console.warn(`[mailer] SMTP não configurado — e-mail NÃO enviado. Para: ${input.to} | Assunto: ${input.subject}`);
    console.warn(`[mailer] Conteúdo:\n${input.text ?? input.html}`);
    return { ok: true };
  }

  try {
    await t.sendMail({
      from: env.emailFrom,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true };
  } catch (e) {
    console.error("[mailer] falha ao enviar:", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Layout HTML compartilhado — mesma ideia do helper do BeeFlow, com a marca do Beely. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#E59313">${escapeHtml(title)}</h2>
      ${bodyHtml}
      <p style="color:#6b7280;font-size:12px;margin-top:24px">Be Fluent CRM</p>
    </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
