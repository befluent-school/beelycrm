import { NextResponse } from "next/server";
import { getCalendarAccount } from "@/lib/calendar/store";
import { createCalendarEvent } from "@/lib/calendar/google";

export const dynamic = "force-dynamic";

/**
 * POST /api/calendar/create-event
 * body: { summary, description?, startISO, endISO, attendeeEmail? }
 * Cria o evento no Google Calendar da conta conectada, com link do Meet.
 * Usado tanto por uma ação manual na UI quanto pelo motor de automações
 * (ação "schedule_meeting").
 */
export async function POST(request: Request) {
  let body: {
    summary?: string;
    description?: string;
    startISO?: string;
    endISO?: string;
    attendeeEmail?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.summary || !body.startISO || !body.endISO) {
    return NextResponse.json({ ok: false, error: "summary, startISO e endISO são obrigatórios" }, { status: 400 });
  }

  const account = await getCalendarAccount();
  if (!account || account.status !== "connected" || !account.oauthRefreshToken) {
    return NextResponse.json(
      { ok: false, error: "Google Calendar não conectado. Conecte em Integrações antes de agendar reuniões." },
      { status: 400 }
    );
  }

  const result = await createCalendarEvent({
    refreshToken: account.oauthRefreshToken,
    summary: body.summary,
    description: body.description,
    startISO: body.startISO,
    endISO: body.endISO,
    attendeeEmail: body.attendeeEmail,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  return NextResponse.json(result);
}
