import { NextResponse } from "next/server";
import { getRecentMessages } from "@/lib/message-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = Number(searchParams.get("since") ?? 0);
  const msgs = await getRecentMessages(since || undefined);
  return NextResponse.json(msgs);
}
