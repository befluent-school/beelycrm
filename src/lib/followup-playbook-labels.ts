/**
 * Rótulos e chaves das situações de follow-up do Playbook Comercial Be Fluent v3.
 * Módulo client-safe (sem dependências de Supabase) — importável na UI.
 * A lógica de persistência fica em src/lib/followup-playbook-store.ts (server).
 */

export type FollowupSituation =
  | "proposta_sumiu"
  | "levar_pro_time"
  | "reativacao_frio"
  | "pediu_desconto_sumiu"
  | "contrato_sem_retorno"
  | "pediu_info_sumiu"
  | "ultima_tentativa";

export const SITUATION_LABELS: Record<FollowupSituation, string> = {
  proposta_sumiu: "Lead sumiu depois da proposta",
  levar_pro_time: 'Reunião terminou em "vou levar pro time"',
  reativacao_frio: "Reativação de lead frio (D+30/60)",
  pediu_desconto_sumiu: "Pediu desconto e sumiu",
  contrato_sem_retorno: "Contrato enviado sem retorno",
  pediu_info_sumiu: 'Pediu "mais informação" e sumiu',
  ultima_tentativa: "Última tentativa antes de encerrar",
};
