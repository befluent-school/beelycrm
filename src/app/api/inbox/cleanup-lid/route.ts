import { NextResponse } from "next/server";
import { and, eq, inArray, like } from "drizzle-orm";
import { db as client, schema } from "@/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/inbox/cleanup-lid
 * Remove APENAS mensagens fantasma criadas pelo bug do eco "Ao enviar"
 * da Z-API: mensagens fromMe=true cujo "from" é um LID (contém "@lid"
 * ou "@"), que geravam conversas duplicadas tipo "Be Fluent | Suporte
 * Comercial". Não afeta nenhuma conversa real de lead.
 * Execute uma vez após o deploy para limpar o histórico existente.
 */
export async function GET() {
  if (!client) {
    return NextResponse.json({ ok: false, reason: "db_not_configured" });
  }

  // Busca candidatas antes de apagar, para retornar um relatório do que foi removido
  const candidates = await client.select({
    id: schema.inboxMessages.id,
    from: schema.inboxMessages.from,
    fromName: schema.inboxMessages.fromName,
    text: schema.inboxMessages.text,
  }).from(schema.inboxMessages)
    .where(and(eq(schema.inboxMessages.fromMe, true), like(schema.inboxMessages.from, "%@%")));

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, removed: 0, message: "Nenhuma conversa fantasma encontrada." });
  }

  const ids = candidates.map((c) => c.id);
  await client.delete(schema.inboxMessages).where(inArray(schema.inboxMessages.id, ids));

  return NextResponse.json({
    ok: true,
    removed: candidates.length,
    samples: candidates.slice(0, 10).map((c) => ({ from: c.from, fromName: c.fromName, text: c.text?.slice(0, 40) })),
  });
}
