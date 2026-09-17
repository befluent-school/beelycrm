/**
 * Motor de execução de automações — roda no client, no exato momento em que
 * o gatilho estrutural acontece (mesmo padrão já usado por winDealAndOnboard
 * no store: lógica de reação a mudança de estado direto na action que muda
 * o estado). Gatilhos por tempo (deal_stale) são avaliados separadamente
 * por um cron (/api/cron/automations), não por aqui.
 *
 * Cada ação real é uma chamada a uma API/store já existente — o motor não
 * reimplementa envio de WhatsApp, e-mail ou criação de evento; só orquestra.
 */

import { toast } from "sonner";
import type { Automation, AutomationTrigger, Contact, Deal, StoreState } from "@/lib/store";

type Store = StoreState;

function triggerMatches(trigger: AutomationTrigger, event: AutomationTrigger): boolean {
  if (trigger.type !== event.type) return false;
  if (trigger.type === "deal_stage_changed" && event.type === "deal_stage_changed") {
    return trigger.pipelineId === event.pipelineId && trigger.stageId === event.stageId;
  }
  return true;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function renderVars(text: string, contact?: Contact): string {
  const now = new Date();
  return text
    .replaceAll("{{primeiroNome}}", contact ? firstName(contact.name) : "")
    .replaceAll("{{dia}}", now.toLocaleDateString("pt-BR"))
    .replaceAll("{{mes}}", now.toLocaleDateString("pt-BR", { month: "long" }));
}

interface RunContext {
  deal?: Deal;
  contact?: Contact;
}

/**
 * Dispara todas as automações ativas e estruturadas cujo gatilho bate com o
 * evento. Chamado a partir das próprias actions do store (winDeal, moveDeal,
 * addContact) e do cron de gatilhos por tempo.
 */
export async function runAutomations(
  event: AutomationTrigger,
  ctx: RunContext,
  store: Pick<Store, "automations" | "moveDeal" | "updateContact" | "updateDeal" | "sdrs">
): Promise<void> {
  const matching = store.automations.filter((a) => a.active && triggerMatches(a.trigger, event));
  if (matching.length === 0) return;

  for (const automation of matching) {
    try {
      await executeAction(automation, ctx, store);
    } catch (e) {
      console.error(`[automation-engine] falha ao executar "${automation.name}":`, e);
      toast.error(`Automação "${automation.name}" falhou: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

async function executeAction(
  automation: Automation,
  ctx: RunContext,
  store: Pick<Store, "moveDeal" | "updateContact" | "updateDeal" | "sdrs">
): Promise<void> {
  const action = automation.action;
  const { deal, contact } = ctx;

  switch (action.type) {
    case "move_deal_stage": {
      if (!deal) return;
      store.moveDeal(deal.id, action.stageId);
      toast.success(`Automação "${automation.name}": negócio movido.`);
      return;
    }

    case "add_tag": {
      if (!contact) return;
      if (contact.tags.includes(action.tag)) return;
      store.updateContact(contact.id, { tags: [...contact.tags, action.tag] });
      toast.success(`Automação "${automation.name}": tag "${action.tag}" adicionada.`);
      return;
    }

    case "add_score": {
      if (!contact) return;
      store.updateContact(contact.id, { score: Math.max(0, Math.min(100, contact.score + action.points)) });
      toast.success(`Automação "${automation.name}": ${action.points >= 0 ? "+" : ""}${action.points} pts.`);
      return;
    }

    case "schedule_meeting": {
      if (!contact) return;
      const start = new Date(Date.now() + 24 * 60 * 60 * 1000); // amanhã, mesmo horário — ajustável depois na Agenda
      const end = new Date(start.getTime() + action.durationMinutes * 60 * 1000);
      const res = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: renderVars(action.title, contact) || `Reunião com ${contact.name}`,
          description: deal ? `Negócio: ${deal.title}` : undefined,
          startISO: start.toISOString(),
          endISO: end.toISOString(),
          attendeeEmail: contact.email || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(`Automação "${automation.name}": falha ao agendar reunião — ${data.error ?? "erro desconhecido"}`);
        return;
      }
      toast.success(`Automação "${automation.name}": reunião agendada no Google Calendar.`);
      return;
    }

    case "send_whatsapp": {
      if (!contact?.phone) return;
      const script = await fetchScript(action.scriptId);
      if (!script) {
        toast.error(`Automação "${automation.name}": script não encontrado.`);
        return;
      }
      const sdrId = deal?.sdrId ?? contact.sdrId ?? store.sdrs[0]?.id;
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: contact.phone,
          text: renderVars(script.body, contact),
          contactName: contact.name,
          sdrId,
        }),
      });
      const data = await res.json();
      if (data.sendOk === false) {
        toast.error(`Automação "${automation.name}": envio de WhatsApp falhou — ${data.sendError ?? "erro desconhecido"}`);
        return;
      }
      toast.success(`Automação "${automation.name}": WhatsApp enviado.`);
      return;
    }

    case "send_email": {
      if (!contact?.email) return;
      const script = await fetchScript(action.scriptId);
      if (!script) {
        toast.error(`Automação "${automation.name}": script não encontrado.`);
        return;
      }
      const res = await fetch("/api/remarketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Automação: ${automation.name}`,
          status: "running",
          audienceFilter: { contactIds: [contact.id] },
        }),
      }).catch(() => null);
      if (!res || !res.ok) {
        toast.error(`Automação "${automation.name}": falha ao enviar e-mail.`);
        return;
      }
      toast.success(`Automação "${automation.name}": e-mail disparado.`);
      return;
    }

    case "legacy":
      return; // automação antiga, sem execução estruturada — só exibida no histórico.
  }
}

async function fetchScript(id: string): Promise<{ body: string } | null> {
  try {
    const res = await fetch("/api/scripts");
    const scripts: { id: string; body: string }[] = await res.json();
    return scripts.find((s) => s.id === id) ?? null;
  } catch {
    return null;
  }
}
