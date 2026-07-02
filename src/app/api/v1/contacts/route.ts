import { NextResponse } from "next/server";
import { IS_DEMO } from "@/lib/env";
import { CONTACTS } from "@/lib/demo-data";

/**
 * Public REST API — list contacts.
 * Auth: `Authorization: Bearer <api_key>`.
 * In demo mode it returns the mock dataset for any key starting with "bly_".
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const key = auth.replace(/^Bearer\s+/i, "").trim();

  if (!key || !key.startsWith("bly_")) {
    return NextResponse.json(
      { error: "unauthorized", message: "Forneça uma API key válida no header Authorization." },
      { status: 401 }
    );
  }

  if (IS_DEMO) {
    return NextResponse.json({
      object: "list",
      data: CONTACTS.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        source: c.source,
        score: c.score,
        tags: c.tags,
      })),
      has_more: false,
    });
  }

  // Produção: validar a key (hash) e consultar o banco filtrando por org.
  return NextResponse.json({ object: "list", data: [], has_more: false });
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.replace(/^Bearer\s+/i, "").trim().startsWith("bly_")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "validation", message: "Campo 'name' é obrigatório." }, { status: 422 });
  }
  return NextResponse.json({ object: "contact", id: "new", ...body }, { status: 201 });
}
