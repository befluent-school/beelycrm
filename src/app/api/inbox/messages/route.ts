import { NextResponse } from "next/server";
import { getRecentMessages } from "@/lib/message-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = Number(searchParams.get("since") ?? 0);
  return NextResponse.json(getRecentMessages(since || undefined));
}
