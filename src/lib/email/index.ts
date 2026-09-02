/** Seleção de provedor de e-mail para remarketing e follow-ups. */

import { env, HAS_RESEND } from "@/lib/env";
import type { EmailProvider } from "./provider";
import { createGmailProvider } from "./gmail";
import { createResendProvider } from "./resend";
import { getEmailAccount } from "./store";

export type { EmailProvider, SendEmailInput, SendEmailResult } from "./provider";
export { buildGmailAuthUrl, exchangeCodeForTokens, GMAIL_SEND_SCOPE } from "./gmail";

/**
 * Resolve o provedor ativo:
 * 1. Conta Gmail conectada (refresh token em email_accounts) → Gmail API
 * 2. RESEND_API_KEY presente → Resend
 * 3. caso contrário null (rotas devem responder com erro claro)
 */
export async function getEmailProvider(): Promise<EmailProvider | null> {
  const account = await getEmailAccount().catch(() => null);
  if (account?.provider === "gmail" && account.oauthRefreshToken && env.googleOAuthClientId) {
    return createGmailProvider(account.oauthRefreshToken);
  }
  if (HAS_RESEND) return createResendProvider();
  return null;
}

/** Motivo textual quando não há provedor — para mensagens de erro nas rotas. */
export function emailProviderUnavailableReason(): string {
  if (!env.googleOAuthClientId) {
    return "Conecte a conta Gmail em Remarketing > Conta de envio (GOOGLE_OAUTH_CLIENT_ID ausente no ambiente) ou configure RESEND_API_KEY.";
  }
  return "Nenhuma conta de e-mail conectada. Vá em Remarketing > Conta de envio e conecte o Gmail.";
}
