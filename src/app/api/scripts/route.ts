import { NextResponse } from "next/server";
import {
  getScripts,
  createScript,
  updateScript,
  deleteScript,
  type ScriptCategory,
} from "@/lib/scripts-store";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES: ScriptCategory[] = [
  "followup", "remarketing", "reativacao", "objecao", "fechamento", "vendas",
];

/** GET /api/scripts — biblioteca de scripts (reativação, objeção, fechamento, vendas, remarketing). */
export async function GET() {
  const scripts = await getScripts();
  return NextResponse.json(scripts);
}

/** POST /api/scripts — cria um novo script. */
export async function POST(request: Request) {
  let body: { category?: string; title?: string; channel?: string; body?: string; active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.category || !VALID_CATEGORIES.includes(body.category as ScriptCategory)) {
    return NextResponse.json({ error: "category inválida" }, { status: 400 });
  }
  if (!body.title?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: "title e body são obrigatórios" }, { status: 400 });
  }

  const script = await createScript({
    category: body.category as ScriptCategory,
    title: body.title.trim(),
    channel: body.channel === "email" ? "email" : body.channel === "call" ? "call" : "whatsapp",
    body: body.body,
    active: body.active ?? true,
  });

  return NextResponse.json(script);
}

/** PUT /api/scripts — atualiza um script existente. */
export async function PUT(request: Request) {
  let body: { id?: string; category?: string; title?: string; channel?: string; body?: string; active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
  }
  if (body.category !== undefined && !VALID_CATEGORIES.includes(body.category as ScriptCategory)) {
    return NextResponse.json({ error: "category inválida" }, { status: 400 });
  }

  await updateScript(body.id, {
    category: body.category as ScriptCategory | undefined,
    title: body.title,
    channel: body.channel as "whatsapp" | "email" | "call" | undefined,
    body: body.body,
    active: body.active,
  });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/scripts?id=... — apaga um script. */
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
  }
  await deleteScript(id);
  return NextResponse.json({ ok: true });
}
