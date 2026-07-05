import { subscribe, getRecentMessages } from "@/lib/message-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = Number(searchParams.get("since") ?? 0);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Envia mensagens recentes imediatamente
      const recent = getRecentMessages(since || undefined);
      for (const msg of recent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
      }

      // Subscreve a novas mensagens
      const unsub = subscribe((msg) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
        } catch {
          unsub();
        }
      });

      // Heartbeat a cada 25s para manter conexão viva
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(interval);
          unsub();
        }
      }, 25000);

      // Limpa quando o cliente desconecta
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        unsub();
        try { controller.close(); } catch { /* já fechado */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
