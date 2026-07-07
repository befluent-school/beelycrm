"use client";

import { Button } from "@/components/ui/button";
import { IS_DEMO, env } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

// Usa a URL configurada em NEXT_PUBLIC_APP_URL, com fallback para window.location.origin
function getCallbackUrl() {
  const base = env.appUrl && env.appUrl !== "http://localhost:3000"
    ? env.appUrl
    : (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/auth/callback`;
}

export function GoogleButton() {
  async function handleGoogle() {
    if (IS_DEMO) {
      document.cookie = "beely_session=demo; path=/; max-age=604800";
      window.location.href = "/dashboard";
      return;
    }
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getCallbackUrl(),
        queryParams: {
          // Força tela de consentimento mesmo se já logado — necessário em alguns mobile browsers
          prompt: "select_account",
        },
      },
    });
  }

  return (
    <Button type="button" variant="outline" className="w-full gap-2" onClick={handleGoogle}>
      <GoogleIcon />
      Continuar com Google
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.5l2.6-2.6C16.9 2.7 14.7 1.8 12 1.8 6.5 1.8 2 6.3 2 11.8s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.8H12z" />
    </svg>
  );
}
