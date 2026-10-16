/**
 * GET /api/inbox/events
 * Server-Sent Events — envia novas mensagens em tempo real para o frontend.
 * O cliente conecta uma vez e recebe eventos `message` com JSON de cada
 * mensagem nova, sem polling periódico.
 *
 * Compatível com Next.js App Router (edge runtime não necessário — usa Node streams).
 * Em caso de queda, o browser reconecta automaticamente (EventSource padrão).
 */
import { getRecentMessages } from "@/lib/message-store";

export const dynamic = "force-dynamic";

// Registro global de clientes SSE ativos — compartilhado entre requests no mesmo processo
const globalForSse = globalThis as unknown as {
  __sseClients?: Set<(data: string) => void>;
};
if (!globalForSse.__sseClients) {
  globalForSse.__sseClients = new Set();
}
const sseClients = globalForSse.__sseClients;

/**
 * Notifica todos os clientes SSE conectados com uma nova mensagem.
 * Chamado por pushMessage() após gravar no banco.
 */
export function notifySseClients(msgJson: string) {
  for (const send of sseClients) {
    try { send(msgJson); } catch { /* cliente desconectado */ }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = Number(searchParams.get("since") ?? 0);

  // Busca mensagens pendentes desde a última conexão do cliente
  const pending = await getRecentMessages(since || undefined);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Envia mensagens pendentes imediatamente ao conectar
      for (const msg of pending) {
        const data = `data: ${JSON.stringify(msg)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      // Heartbeat a cada 20s para manter a conexão viva (evita timeout de proxy/nginx)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 20_000);

      // Registra este cliente para receber notificações push
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          cleanup();
        }
      };

      const cleanup = () => {
        clearInterval(heartbeat);
        sseClients.delete(send);
      };

      sseClients.add(send);

      // Remove ao fechar a conexão
      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // desativa buffering do Nginx
    },
  });
}
