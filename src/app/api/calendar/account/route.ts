import { NextResponse } from "next/server";
import { getCalendarAccount, saveCalendarAccount } from "@/lib/calendar/store";

export const dynamic = "force-dynamic";

/** GET /api/calendar/account — status da conexão do Google Calendar. */
export async function GET() {
  const account = await getCalendarAccount();
  if (!account) return NextResponse.json({ status: "disconnected" });
  // Nunca expõe o refresh token para o client.
  const { oauthRefreshToken: _omit, ...safe } = account;
  void _omit;
  return NextResponse.json(safe);
}

/** DELETE /api/calendar/account — desconecta. */
export async function DELETE() {
  const account = await getCalendarAccount();
  if (account) {
    await saveCalendarAccount({ ...account, oauthRefreshToken: null, status: "disconnected" });
  }
  return NextResponse.json({ ok: true });
}
