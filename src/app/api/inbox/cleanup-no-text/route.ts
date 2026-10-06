import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db as client, schema } from "@/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/inbox/cleanup-no-text
 * Remove APENAS mensagens fantasma criadas pelo bug de eventos de status
 * da Z-API (DeliveryCallback, ReadCallback etc.) sendo tratados como
 * mensagem de conteúdo: caíam no fallback "(mensagem sem texto)" mesmo sem
 * o lead ter mandado nada. O webhook já foi corrigido para ignorar esses
 * eventos (só processa type=ReceivedCallback); esta rota só limpa o
 * histórico que já tinha sido gravado antes da correção.
 * Não afeta nenhuma mensagem real (com texto, mídia ou legenda).
 */
export async function GET() {
  if (!client) {
    return NextResponse.json({ ok: false, reason: "db_not_configured" });
  }

  const candidates = await client.select({
    id: schema.inboxMessages.id,
    from: schema.inboxMessages.from,
    fromName: schema.inboxMessages.fromName,
    fromMe: schema.inboxMessages.fromMe,
  }).from(schema.inboxMessages)
    .where(eq(schema.inboxMessages.text, "(mensagem sem texto)"));

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, removed: 0, message: "Nenhuma mensagem fantasma encontrada." });
  }

  const ids = candidates.map((c) => c.id);
  await client.delete(schema.inboxMessages).where(inArray(schema.inboxMessages.id, ids));

  return NextResponse.json({
    ok: true,
    removed: candidates.length,
    samples: candidates.slice(0, 10).map((c) => ({ from: c.from, fromName: c.fromName, fromMe: c.fromMe })),
  });
}
