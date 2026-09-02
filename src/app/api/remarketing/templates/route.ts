import { NextResponse } from "next/server";
import { listTemplates, saveTemplate, deleteTemplate } from "@/lib/email/store";

export const dynamic = "force-dynamic";

/** GET /api/remarketing/templates */
export async function GET() {
  return NextResponse.json(await listTemplates());
}

/** POST /api/remarketing/templates — cria ou atualiza (envie id para atualizar). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!body.name || !body.subject || !body.bodyHtml) {
    return NextResponse.json({ error: "name, subject e bodyHtml são obrigatórios" }, { status: 400 });
  }
  const saved = await saveTemplate({
    id: body.id,
    name: String(body.name),
    subject: String(body.subject),
    bodyHtml: String(body.bodyHtml),
    bodyText: body.bodyText ? String(body.bodyText) : undefined,
  });
  return NextResponse.json(saved);
}

/** DELETE /api/remarketing/templates?id=... */
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id ausente" }, { status: 400 });
  await deleteTemplate(id);
  return NextResponse.json({ ok: true });
}
