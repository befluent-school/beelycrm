import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Google OAuth / email confirmation callback — exchanges the code for a session. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Usa NEXT_PUBLIC_APP_URL se configurado (evita problemas de origin no Render/mobile)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${next}`);
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
  }
  return NextResponse.redirect(`${base}/login?error=auth`);
}
