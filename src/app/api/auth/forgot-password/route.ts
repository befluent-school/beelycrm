import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Gera um link de recuperação de uso único (Supabase Auth, type=recovery) e
 * envia por e-mail via Resend. O link autentica o usuário numa sessão de
 * recovery de curta duração ao ser clicado (via /auth/callback) e leva para
 * /nova-senha, onde define a senha nova — nenhuma senha real é gerada nem
 * trafega em texto puro em nenhum momento.
 *
 * ANTES: esta rota gerava uma senha REAL (generateTempPassword) e a
 * aplicava direto na conta (admin.auth.admin.updateUserById), mandando-a em
 * texto puro por e-mail — qualquer um que interceptasse esse e-mail (regra
 * de encaminhamento, provedor de e-mail comprometido, inbox compartilhada)
 * tinha uma credencial real e sem expiração imediatamente, e o reset
 * sobrescrevia a senha ANTES de qualquer confirmação de uso, permitindo
 * sequestro de conta só de pedir reset para o e-mail de outra pessoa.
 */
export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({ email: "" }));
  // Sempre responde ok — não revela se o e-mail existe na base.
  const ok = NextResponse.json({ ok: true });
  if (!email) return ok;

  const admin = createAdminClient();
  if (!admin) return ok;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/nova-senha")}` },
  });

  if (error || !data?.properties?.action_link) {
    // Não loga o e-mail não encontrado como erro — é o caminho normal para
    // e-mails que não existem na base (mantém a resposta genérica acima).
    if (error) console.error("[forgot-password] generateLink falhou:", error.message);
    return ok;
  }

  await sendResetLinkEmail(email, data.properties.action_link);
  return ok;
}

async function sendResetLinkEmail(to: string, link: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Beely <no-reply@beely.app>";
  if (!apiKey) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: "Redefinir sua senha",
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#E59313">Redefinir senha</h2>
          <p>Clique no botão abaixo para definir uma nova senha. Este link funciona uma única vez e expira em pouco tempo.</p>
          <p style="text-align:center;margin:24px 0">
            <a href="${link}" style="display:inline-block;background:#E59313;color:#fff;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none">Definir nova senha</a>
          </p>
          <p style="color:#6b7280;font-size:12px">Se você não solicitou, ignore este e-mail — sua senha atual continua válida.</p>
        </div>`,
    }),
  }).catch(() => {});
}
