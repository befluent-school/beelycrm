import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "Supabase não configurado" }, { status: 503 });
  }
  const supabase = createClient(url, key);

  const { error, count } = await supabase
    .from("inbox_messages")
    .delete({ count: "exact" })
    .is("sdr_id", null);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: count ?? 0 });
}
