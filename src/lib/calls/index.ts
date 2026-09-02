/** Seleção de provedor de voz IA. */

import { env } from "@/lib/env";
import type { CallProvider } from "./provider";
import { createVapiProvider } from "./vapi";
import { createTwilioProvider } from "./twilio";

export type {
  AssistantConfig,
  CallEvent,
  CallProvider,
  StartCallInput,
  StartCallResult,
} from "./provider";

export function getCallProvider(preferred?: "vapi" | "twilio"): CallProvider {
  if (preferred === "twilio") return createTwilioProvider();
  return createVapiProvider();
}

export function callProviderUnavailableReason(): string {
  if (!env.vapiPrivateKey) {
    return "Configure VAPI_PRIVATE_KEY, VAPI_PHONE_NUMBER_ID e o assistant em Integrações > Vapi para ativar as ligações com IA.";
  }
  if (!env.vapiPhoneNumberId) {
    return "VAPI_PHONE_NUMBER_ID ausente — importe um número no painel da Vapi.";
  }
  return "";
}
