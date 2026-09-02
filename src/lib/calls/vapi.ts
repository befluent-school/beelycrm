/**
 * Provedor de voz IA Vapi (telefonia + STT + LLM + TTS numa API).
 *
 * Iniciar ligação: POST https://api.vapi.ai/call
 *   Authorization: Bearer <VAPI_PRIVATE_KEY>
 *   { phoneNumberId, customer: { number }, assistantId | assistant: {...}, metadata }
 *
 * Webhook (Server URL configurado no assistant/número): recebe objetos
 *   { message: { type: "status-update" | "end-of-call-report" | "transcript" | ... } }
 */

import { env } from "@/lib/env";
import type {
  AssistantConfig,
  CallEvent,
  CallProvider,
  StartCallInput,
  StartCallResult,
} from "./provider";

const API_URL = "https://api.vapi.ai/call";

function toVapiAssistant(a?: AssistantConfig) {
  if (!a) return undefined;
  const assistant: Record<string, unknown> = {};
  if (a.firstMessage) assistant.firstMessage = a.firstMessage;
  if (a.systemPrompt) {
    assistant.model = {
      provider: "openai",
      model: a.model || "gpt-4o",
      messages: [{ role: "system", content: a.systemPrompt }],
    };
  }
  if (a.voice) assistant.voice = { provider: "11labs", voiceId: a.voice };
  if (a.language) assistant.transcriber = { provider: "deepgram", language: a.language };
  return Object.keys(assistant).length ? assistant : undefined;
}

const VAPI_STATUS_MAP: Record<string, CallEvent["status"]> = {
  queued: "queued",
  ringing: "ringing",
  "in-progress": "in_progress",
  forwarding: "in_progress",
  ended: "completed",
};

const VAPI_ENDED_REASON_MAP: Record<string, CallEvent["status"]> = {
  "customer-did-not-answer": "no_answer",
  "customer-busy": "no_answer",
  "voicemail": "voicemail",
  "assistant-error": "failed",
  "pipeline-error": "failed",
  "phone-call-provider-closed-websocket": "completed",
};

export function createVapiProvider(): CallProvider {
  return {
    name: "vapi",

    async startCall(input: StartCallInput): Promise<StartCallResult> {
      if (!env.vapiPrivateKey) return { ok: false, error: "VAPI_PRIVATE_KEY ausente" };
      if (!env.vapiPhoneNumberId) return { ok: false, error: "VAPI_PHONE_NUMBER_ID ausente" };

      const body: Record<string, unknown> = {
        phoneNumberId: env.vapiPhoneNumberId,
        customer: { number: input.toNumber },
        metadata: input.metadata ?? {},
      };
      const assistant = toVapiAssistant(input.assistant);
      if (assistant) body.assistant = assistant;
      else if (env.vapiAssistantId) body.assistantId = env.vapiAssistantId;
      else return { ok: false, error: "Nenhum assistant configurado (defina o prompt do agente ou VAPI_ASSISTANT_ID)" };

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.vapiPrivateKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, error: data.message || data.error || `HTTP ${res.status}` };
        return { ok: true, callId: data.id };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },

    parseWebhook(body: unknown, headers: Headers): CallEvent | null {
      // Validação opcional de segredo compartilhado.
      if (env.vapiWebhookSecret) {
        const got = headers.get("x-vapi-secret") || headers.get("x-vapi-signature");
        if (got && got !== env.vapiWebhookSecret) return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (body as any)?.message ?? body;
      if (!msg || typeof msg !== "object") return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const call = (msg as any).call ?? {};
      const providerCallId: string = call.id ?? msg.callId ?? "";
      if (!providerCallId) return null;

      const metadata: Record<string, string> = call.metadata ?? msg.metadata ?? {};
      const type: string = msg.type ?? "";

      if (type === "status-update") {
        const raw: string = msg.status ?? "";
        return {
          providerCallId,
          status: VAPI_STATUS_MAP[raw] ?? "in_progress",
          metadata,
        };
      }

      if (type === "end-of-call-report") {
        const endedReason: string = msg.endedReason ?? "";
        const status = VAPI_ENDED_REASON_MAP[endedReason] ?? "completed";
        const startMs = msg.startedAt ? Date.parse(msg.startedAt) : undefined;
        const endMs = msg.endedAt ? Date.parse(msg.endedAt) : undefined;
        const durationSec =
          typeof msg.durationSeconds === "number"
            ? Math.round(msg.durationSeconds)
            : startMs && endMs
              ? Math.round((endMs - startMs) / 1000)
              : undefined;
        const transcript = Array.isArray(msg.messages)
          ? msg.messages
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((m: any) => m.role && (m.message || m.content))
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((m: any) => ({ role: m.role, text: m.message ?? m.content, at: m.time }))
          : undefined;
        return {
          providerCallId,
          status,
          durationSec,
          costCents: typeof msg.cost === "number" ? Math.round(msg.cost * 100) : undefined,
          recordingUrl: msg.recordingUrl ?? msg.artifact?.recordingUrl,
          transcript,
          summary: msg.summary ?? msg.analysis?.summary,
          endedReason,
          startedAt: msg.startedAt,
          endedAt: msg.endedAt,
          metadata,
        };
      }

      return null;
    },
  };
}
