import { NextResponse } from "next/server";
import { getRecentMessages, getThreadFirstTimestamps } from "@/lib/message-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const since = Number(searchParams.get("since") ?? 0) || undefined;
  const from  = Number(searchParams.get("from")  ?? 0) || undefined;
  const to    = Number(searchParams.get("to")    ?? 0) || undefined;

  // ?firstTimestamps=1 → devolve mapa threadKey→firstTs para filtrar por data da 1ª mensagem
  if (searchParams.get("firstTimestamps") === "1") {
    const map = await getThreadFirstTimestamps();
    return NextResponse.json(map);
  }

  const msgs = await getRecentMessages({ since, from, to });
  return NextResponse.json(msgs);
}
