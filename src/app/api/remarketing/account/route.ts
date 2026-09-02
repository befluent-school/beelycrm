import { NextResponse } from "next/server";
import { HAS_GMAIL_OAUTH, HAS_RESEND, env } from "@/lib/env";
import { getEmailAccount, saveEmailAccount } from "@/lib/email/store";

export const dynamic = "force-dynamic";

/** GET /api/remarketing/account — status da conta de envio. */
export async function GET() {
  const account = await getEmailAccount().catch(() => null);
  return NextResponse.json({
    account: account
      ? {
          provider: account.provider,
          fromEmail: account.fromEmail,
          fromName: account.fromName,
          status: account.status,
          connected: account.status === "connected" && !!account.oauthRefreshToken,
          lastError: account.lastError,
          connectedAt: account.connectedAt,
        }
      : null,
    canConnectGmail: HAS_GMAIL_OAUTH,
    resendConfigured: HAS_RESEND,
    defaultFromEmail: env.remarketingFromEmail,
  });
}

/** DELETE /api/remarketing/account — desconecta (limpa o refresh token). */
export async function DELETE() {
  const account = await getEmailAccount().catch(() => null);
  if (account) {
    await saveEmailAccount({
      ...account,
      oauthRefreshToken: null,
      status: "disconnected",
      lastError: null,
      connectedAt: null,
    });
  }
  return NextResponse.json({ ok: true });
}
