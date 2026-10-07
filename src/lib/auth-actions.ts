"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { IS_DEMO } from "@/lib/env";
import * as authService from "@/lib/auth/service";
import { setSessionCookie, clearSessionCookie, SESSION_COOKIE, revokeSession, getCurrentSession } from "@/lib/auth/session";

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

  const result = await authService.loginWithPassword(email, password);
  if (!result.ok || !result.token) return { error: result.error ?? "E-mail ou senha inválidos." };
  await setSessionCookie(result.token);
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

  const result = await authService.signup(email, password, name);
  if (!result.ok || !result.token) return { error: result.error ?? "Não foi possível criar sua conta." };
  await setSessionCookie(result.token);
  redirect("/dashboard");
}

/* ─── Esqueci minha senha (link de redefinição de uso único) ──── */
export async function forgotPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe seu e-mail." };

  if (IS_DEMO) {
    return {
      notice:
        "Se o e-mail existir, enviamos um link para redefinir sua senha. (Modo demo: nenhum e-mail real é enviado.)",
    };
  }

  // Sempre devolve a mesma mensagem genérica — requestPasswordReset já é
  // silenciosa internamente quando o e-mail não existe (sem enumeração).
  await authService.requestPasswordReset(email).catch((e) => console.error("[auth] forgot-password falhou:", e));
  return { notice: "Se o e-mail existir, enviamos um link para redefinir sua senha. Verifique sua caixa de entrada." };
}

/* ─── Trocar/definir senha (link de redefinição ou troca voluntária) ──── */
export async function changePasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const resetToken = formData.get("token") ? String(formData.get("token")) : undefined;
  if (password.length < 8) return { error: "A senha deve ter ao menos 8 caracteres." };
  if (password !== confirm) return { error: "As senhas não coincidem." };

  if (IS_DEMO) redirect("/dashboard");

  // Veio de um link de "esqueci minha senha" (?token=) — não exige sessão.
  if (resetToken) {
    const result = await authService.resetPasswordWithToken(resetToken, password);
    if (!result.ok) return { error: result.error ?? "Não foi possível redefinir a senha." };
    redirect("/login?reset=ok");
  }

  // Troca voluntária — exige sessão ativa.
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const result = await authService.changePassword(session.user.id, password);
  if (!result.ok) return { error: result.error ?? "Não foi possível trocar a senha." };

  // changePassword revoga todas as sessões (inclusive a atual) — gera uma
  // nova para não deslogar quem acabou de trocar a própria senha.
  const { createSession } = await import("@/lib/auth/session");
  const newToken = await createSession(session.user.id);
  await setSessionCookie(newToken);
  redirect("/dashboard");
}

/* ─── Logout ────────────────────────────────────────────── */
export async function logoutAction() {
  if (IS_DEMO) {
    (await cookies()).delete(DEMO_COOKIE);
    redirect("/login");
  }

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(token).catch((e) => console.error("[auth] logout falhou:", e));
  await clearSessionCookie();
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
