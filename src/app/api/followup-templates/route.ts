import { NextResponse } from "next/server";
import { getTemplates, saveTemplate } from "@/lib/followup-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const templates = await getTemplates();
  return NextResponse.json(templates);
}

export async function PUT(request: Request) {
  let body: { step?: number; channel?: string; message?: string; subject?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.step || !body.message) {
    return NextResponse.json({ error: "step e message são obrigatórios" }, { status: 400 });
  }
  await saveTemplate(body.step, { channel: body.channel, message: body.message, subject: body.subject });
  return NextResponse.json({ ok: true });
}
