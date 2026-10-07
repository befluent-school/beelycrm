import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, revokeSession, clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(token).catch((e) => console.error("[auth/logout] falhou:", e));
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
