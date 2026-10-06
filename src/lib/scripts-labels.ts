/**
 * Tipos e rótulos da biblioteca de scripts — client-safe (sem Drizzle/pg),
 * importável por componentes "use client". A persistência real fica em
 * src/lib/scripts-store.ts (server-only).
 */

export type ScriptCategory =
  | "followup"
  | "remarketing"
  | "reativacao"
  | "objecao"
  | "fechamento"
  | "vendas";

export const SCRIPT_CATEGORY_LABELS: Record<ScriptCategory, string> = {
  followup:    "Follow-up",
  remarketing: "Remarketing",
  reativacao:  "Reativação de lead",
  objecao:     "Quebra de objeção",
  fechamento:  "Fechamento de venda",
  vendas:      "Script de vendas",
};

export interface Script {
  id: string;
  category: ScriptCategory;
  title: string;
  channel: "whatsapp" | "email" | "call";
  body: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
