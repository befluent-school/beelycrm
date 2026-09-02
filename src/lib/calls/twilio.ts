/**
 * Provedor de voz self-hosted: Twilio (telefonia) + OpenAI Realtime (voz-a-voz).
 *
 * Stub documentado — a implementação completa exige um servidor WebSocket para
 * o Twilio Media Streams fazendo ponte de áudio μ-law 8kHz com a OpenAI
 * Realtime API. Não é servível apenas por rotas HTTP do Next.
 *
 * Fluxo de referência:
 * 1. POST https://api.twilio.com/2010-04-01/Accounts/{SID}/Calls.json
 *    (auth básica SID:AUTH_TOKEN) com `Twiml` contendo <Connect><Stream url="wss://.../media"/>
 * 2. O WS recebe frames de áudio do Twilio, encaminha para
 *    wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview
 * 3. Áudio de resposta do modelo volta pelo mesmo WS para o Twilio.
 * 4. Ao encerrar, o status callback do Twilio dispara /api/calls/webhook.
 */

import type { CallEvent, CallProvider, StartCallResult } from "./provider";

export function createTwilioProvider(): CallProvider {
  return {
    name: "twilio",
    async startCall(): Promise<StartCallResult> {
      return {
        ok: false,
        error:
          "Provedor Twilio + OpenAI Realtime ainda não implementado. Use Vapi (provider padrão) ou implemente o bridge WebSocket de Media Streams.",
      };
    },
    parseWebhook(): CallEvent | null {
      // Twilio status callbacks: CallStatus in queued|ringing|in-progress|completed|busy|no-answer|failed
      return null;
    },
  };
}
