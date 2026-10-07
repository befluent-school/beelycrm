import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/auth/new-password-form";

export const metadata: Metadata = { title: "Nova senha" };

/**
 * Destino do link de recuperação de senha (e-mail com ?token=<reset token>)
 * — o token vem na própria URL (uso único, expira em 1h, ver
 * src/lib/auth/service.ts resetPasswordWithToken). Sem sessão prévia
 * necessária: é assim que alguém que esqueceu a senha consegue entrar de
 * novo sem precisar da senha antiga.
 */
export default async function NewPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <NewPasswordForm resetToken={token} />;
}
