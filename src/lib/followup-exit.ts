/**
 * Quando um lead responde enquanto está em uma etapa "Follow-up N",
 * ele sai automaticamente do fluxo de follow-up e volta para a etapa
 * de Qualificação do mesmo funil — a conversa deixou de ser fria.
 */

import { createClient } from "@supabase/supabase-js";

const FOLLOWUP_RE = /follow[\s-]?up\s*([1-5])/i;
const QUALIFICATION_RE = /qualifica/i;

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function exitFollowupOnReply(phone: string) {
  const client = getClient();
  if (!client) return;

  const phoneClean = phone.replace(/\D/g, "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contacts } = await client.from("contacts").select("id, name, phone").limit(500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contact = (contacts ?? []).find((c: any) => (c.phone ?? "").replace(/\D/g, "") === phoneClean);
  if (!contact) return;

  const { data: deals } = await client
    .from("deals")
    .select("*")
    .eq("status", "open")
    .or(`contact.eq.${contact.name},contact_id.eq.${contact.id}`);
  if (!deals || deals.length === 0) return;

  const { data: pipelines } = await client.from("pipelines").select("*");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const deal of deals as any[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipeline = (pipelines ?? []).find((p: any) => p.id === deal.pipeline_id);
    if (!pipeline) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stage = (pipeline.stages ?? []).find((s: any) => s.id === deal.stage_id);
    if (!stage || !FOLLOWUP_RE.test(stage.name ?? "")) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qualStage = (pipeline.stages ?? []).find((s: any) => QUALIFICATION_RE.test(s.name ?? ""));
    const targetStage = qualStage ?? pipeline.stages?.[0];
    if (!targetStage) continue;

    await client.from("deals").update({
      stage_id: targetStage.id,
      stage_entered_at: new Date().toISOString(),
      history: [
        ...(deal.history ?? []),
        { ts: new Date().toISOString(), text: `Lead respondeu durante follow-up — movido de volta para ${targetStage.name}` },
      ],
    }).eq("id", deal.id);
  }
}
