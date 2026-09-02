/** Contrato comum de provedor de voz com IA para ligações de saída. */

export interface AssistantConfig {
  /** System prompt do agente. */
  systemPrompt?: string;
  /** Primeira frase falada ao atender. */
  firstMessage?: string;
  /** Voz (id/nome do provedor). */
  voice?: string;
  /** Modelo LLM (ex.: gpt-4o, claude-...). */
  model?: string;
  /** Idioma (ex.: pt-BR). */
  language?: string;
}

export interface StartCallInput {
  /** Número de destino em E.164 (+55...). */
  toNumber: string;
  /** Config do agente (sobrepõe o assistant padrão do provedor). */
  assistant?: AssistantConfig;
  /** Metadados livres (contactId, campaignId, callLogId) devolvidos no webhook. */
  metadata?: Record<string, string>;
}

export interface StartCallResult {
  ok: boolean;
  /** ID da ligação no provedor. */
  callId?: string;
  error?: string;
}

/** Evento normalizado a partir do webhook do provedor. */
export interface CallEvent {
  providerCallId: string;
  status:
    | "queued"
    | "ringing"
    | "in_progress"
    | "completed"
    | "no_answer"
    | "failed"
    | "voicemail";
  durationSec?: number;
  costCents?: number;
  recordingUrl?: string;
  transcript?: { role: string; text: string; at?: number }[];
  summary?: string;
  endedReason?: string;
  startedAt?: string;
  endedAt?: string;
  metadata?: Record<string, string>;
}

export interface CallProvider {
  readonly name: "vapi" | "twilio";
  startCall(input: StartCallInput): Promise<StartCallResult>;
  /** Normaliza o corpo cru do webhook do provedor num CallEvent (ou null se irrelevante). */
  parseWebhook(body: unknown, headers: Headers): CallEvent | null;
}
