import { NextResponse } from "next/server";
import { isNull } from "drizzle-orm";
import { db as client, schema } from "@/db";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/inbox/cleanup-orphans
 *
 * Remove permanentemente as conversas em inbox_messages sem sdr_id —
 * histórico anterior ao Inbox multi-SDR (conversas fantasma / desatualizadas
 * que não pertencem a nenhum SDR real cadastrado hoje).
 *
 * Ação destrutiva e irreversível — chamada manualmente pela UI (Configurações
 * → SDRs & WhatsApp), nunca automaticamente.
 */
export async function DELETE() {
  if (!client) {
    return NextResponse.json({ ok: false, error: "db_not_configured" }, { status: 503 });
  }

  try {
    const deleted = await client.delete(schema.inboxMessages)
      .where(isNull(schema.inboxMessages.sdrId))
      .returning({ id: schema.inboxMessages.id });
    return NextResponse.json({ ok: true, deleted: deleted.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
