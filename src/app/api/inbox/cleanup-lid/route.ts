import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, reason: "no_supabase_config" });
  }
  const client = createClient(url, key);

  // Busca candidatas antes de apagar, para retornar um relatório do que foi removido
  const { data: candidates, error: selectError } = await client
    .from("inbox_messages")
    .select("id, from, from_name, from_me, text")
    .eq("from_me", true)
    .like("from", "%@%");

  if (selectError) {
    return NextResponse.json({ ok: false, error: selectError.message });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, removed: 0, message: "Nenhuma conversa fantasma encontrada." });
  }

  const ids = candidates.map((c) => c.id);
  const { error: deleteError } = await client.from("inbox_messages").delete().in("id", ids);

  if (deleteError) {
    return NextResponse.json({ ok: false, error: deleteError.message });
  }

  return NextResponse.json({
    ok: true,
    removed: candidates.length,
    samples: candidates.slice(0, 10).map((c) => ({ from: c.from, fromName: c.from_name, text: c.text?.slice(0, 40) })),
  });
}
