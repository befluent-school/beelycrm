import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, reason: "no_supabase_config" });
  }
  const client = createClient(url, key);

  const { data: candidates, error: selectError } = await client
    .from("inbox_messages")
    .select("id, from, from_name, from_me, text")
    .eq("text", "(mensagem sem texto)");

  if (selectError) {
    return NextResponse.json({ ok: false, error: selectError.message });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, removed: 0, message: "Nenhuma mensagem fantasma encontrada." });
  }

  const ids = candidates.map((c) => c.id);
  const { error: deleteError } = await client.from("inbox_messages").delete().in("id", ids);

  if (deleteError) {
    return NextResponse.json({ ok: false, error: deleteError.message });
  }

  return NextResponse.json({
    ok: true,
    removed: candidates.length,
    samples: candidates.slice(0, 10).map((c) => ({ from: c.from, fromName: c.from_name, fromMe: c.from_me })),
  });
}
