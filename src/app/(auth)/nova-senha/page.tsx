import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/auth/new-password-form";

export const metadata: Metadata = { title: "Nova senha" };

/**
 * Destino do link de recuperação de senha (clicado no e-mail, autenticado
 * via /auth/callback antes de chegar aqui — sessão de recovery de uso
 * único do Supabase). Substitui o fluxo antigo de senha temporária por
 * e-mail em texto puro.
 */
export default function NewPasswordPage() {
  return <NewPasswordForm />;
}
