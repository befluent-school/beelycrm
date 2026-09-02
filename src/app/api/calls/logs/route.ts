import { NextResponse } from "next/server";
import { listCallLogs } from "@/lib/calls/store";

export const dynamic = "force-dynamic";

/** GET /api/calls/logs?limit=100 */
export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 100);
  return NextResponse.json(await listCallLogs(Number.isFinite(limit) ? limit : 100));
}
