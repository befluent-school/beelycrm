/**
 * Quando um lead responde enquanto está em uma etapa "Follow-up N",
 * ele sai automaticamente do fluxo de follow-up e volta para a etapa
 * de Qualificação do mesmo funil — a conversa deixou de ser fria.
 */

import { and, eq, or } from "drizzle-orm";
import { db as client, schema } from "@/db";

const FOLLOWUP_RE = /follow[\s-]?up\s*([1-5])/i;
const QUALIFICATION_RE = /qualifica/i;

export async function exitFollowupOnReply(phone: string) {
  if (!client) return;

  const phoneClean = phone.replace(/\D/g, "");

  const contacts = await client.select({ id: schema.contacts.id, name: schema.contacts.name, phone: schema.contacts.phone })
    .from(schema.contacts).limit(500);
  const contact = contacts.find((c) => (c.phone ?? "").replace(/\D/g, "") === phoneClean);
  if (!contact) return;

  const deals = await client.select().from(schema.deals).where(and(
    eq(schema.deals.status, "open"),
    or(eq(schema.deals.contact, contact.name), eq(schema.deals.contactId, contact.id)),
  ));
  if (deals.length === 0) return;

  const pipelines = await client.select().from(schema.pipelines);

  for (const deal of deals) {
    const pipeline = pipelines.find((p) => p.id === deal.pipelineId);
    if (!pipeline) continue;
    const stage = (pipeline.stages ?? []).find((s) => s.id === deal.stageId);
    if (!stage || !FOLLOWUP_RE.test(stage.name ?? "")) continue;

    const qualStage = (pipeline.stages ?? []).find((s) => QUALIFICATION_RE.test(s.name ?? ""));
    const targetStage = qualStage ?? pipeline.stages?.[0];
    if (!targetStage) continue;

    await client.update(schema.deals).set({
      stageId: targetStage.id,
      stageEnteredAt: new Date(),
      history: [
        ...(deal.history ?? []),
        { ts: new Date().toISOString(), text: `Lead respondeu durante follow-up — movido de volta para ${targetStage.name}` },
      ],
    }).where(eq(schema.deals.id, deal.id));
  }
}
