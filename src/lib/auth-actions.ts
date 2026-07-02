"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { IS_DEMO } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const DEMO_COOKIE = "beely_session";

export type AuthState = { error?: string; notice?: string } | undefined;

/* ─── Login (email/senha) ───────────────────────────────── */
export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Informe e-mail e senha." };

  if (IS_DEMO) {
    await setDemoSession(email);
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou senha inválidos." };
  redirect("/dashboard");
}

/* ─── Cadastro ──────────────────────────────────────────── */
export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!name || !email) return { error: "Preencha nome e e-mail." };
  if (password.length < 8) return { error: "A senha deve ter ao menos 8 caracteres." };
  if (password !== confirm) return { error: "As senhas não coincidem." };

  if (IS_DEMO) {
    await setDemoSession(email);
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

/* ─── Esqueci minha senha (senha temporária por e-mail) ──── */
export async function forgotPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe seu e-mail." };

  if (IS_DEMO) {
    return {
      notice:
        "Se o e-mail existir, enviamos uma senha temporária. Use-a para entrar e você será solicitado a criar uma nova senha. (Modo demo: nenhum e-mail real é enviado.)",
    };
  }

  // Produção: a Edge Function gera senha temporária, marca must_change_password
  // e envia via Resend. Aqui apenas disparamos a requisição.
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) return { error: "Não foi possível processar. Tente novamente." };
  return { notice: "Se o e-mail existir, enviamos uma senha temporária. Verifique sua caixa de entrada." };
}

/* ─── Trocar senha (após senha temporária) ──────────────── */
export async function changePasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "A senha deve ter ao menos 8 caracteres." };
  if (password !== confirm) return { error: "As senhas não coincidem." };

  if (IS_DEMO) redirect("/dashboard");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

/* ─── Logout ────────────────────────────────────────────── */
export async function logoutAction() {
  if (IS_DEMO) {
    (await cookies()).delete(DEMO_COOKIE);
    redirect("/login");
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function setDemoSession(email: string) {
  (await cookies()).set(DEMO_COOKIE, email || "demo", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
