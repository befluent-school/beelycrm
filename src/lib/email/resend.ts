/**
 * Provedor de e-mail Resend (opcional — melhor entregabilidade em volume).
 * Requer domínio verificado; não permite "enviar como @gmail.com".
 * POST https://api.resend.com/emails
 */

import { env } from "@/lib/env";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "./provider";

const API_URL = "https://api.resend.com/emails";

export function createResendProvider(): EmailProvider {
  return {
    name: "resend",
    async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
      if (!env.resendApiKey) return { ok: false, error: "RESEND_API_KEY ausente" };
      const from = input.fromName
        ? `${input.fromName} <${input.fromEmail || env.resendFromEmail}>`
        : input.fromEmail || env.resendFromEmail;
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: input.to,
            subject: input.subject,
            html: input.html,
            text: input.text,
            headers: input.headers,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, error: data.message || `HTTP ${res.status}` };
        return { ok: true, id: data.id };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
  };
}
