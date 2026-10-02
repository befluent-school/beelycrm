import { NextResponse } from "next/server";
import { debugGateOrResponse } from "@/lib/debug-gate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gated = debugGateOrResponse(request);
  if (gated) return gated;

  const instanceId  = process.env.ZAPI_INSTANCE_ID ?? process.env.NEXT_PUBLIC_ZAPI_INSTANCE_ID;
  const token       = process.env.ZAPI_TOKEN ?? process.env.NEXT_PUBLIC_ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) {
    return NextResponse.json({
      ok:     false,
      config: { instanceId: !!instanceId, token: !!token, clientToken: !!clientToken },
      error:  "ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados nas env vars do Render",
      envVarsPresent: {
        ZAPI_INSTANCE_ID:              !!process.env.ZAPI_INSTANCE_ID,
        NEXT_PUBLIC_ZAPI_INSTANCE_ID:  !!process.env.NEXT_PUBLIC_ZAPI_INSTANCE_ID,
        ZAPI_TOKEN:                    !!process.env.ZAPI_TOKEN,
        NEXT_PUBLIC_ZAPI_TOKEN:        !!process.env.NEXT_PUBLIC_ZAPI_TOKEN,
        ZAPI_CLIENT_TOKEN:             !!process.env.ZAPI_CLIENT_TOKEN,
      },
    });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;

  try {
    const statusRes = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/status`,
      { headers }
    );
    const statusData = await statusRes.json();

    return NextResponse.json({
      ok:     statusRes.ok,
      status: statusData,
      config: { instanceId, tokenLength: token.length, hasClientToken: !!clientToken },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
