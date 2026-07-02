import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Generates a temporary password, sets it on the user, flags must_change_password,
 * and e-mails it via Resend. The user logs in with the temp password and is forced
 * to set a new one inside the app.
 */
export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({ email: "" }));
  // Always return ok to avoid leaking which e-mails exist.
  const ok = NextResponse.json({ ok: true });
  if (!email) return ok;

  const admin = createAdminClient();
  if (!admin) return ok;

  // Find the user by email.
  const { data: list } = await admin.auth.admin.listUsers();
  const user = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return ok;

  const tempPassword = generateTempPassword();
  await admin.auth.admin.updateUserById(user.id, {
    password: tempPassword,
    user_metadata: { ...user.user_metadata, must_change_password: true },
  });

  await sendTempPasswordEmail(email, tempPassword);
  return ok;
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function sendTempPasswordEmail(to: string, tempPassword: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Beely <no-reply@beely.app>";
  if (!apiKey) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: "Sua senha temporária",
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#E59313">Senha temporária</h2>
          <p>Use a senha abaixo para acessar sua conta. Por segurança, você será solicitado a criar uma nova senha ao entrar.</p>
          <p style="font-size:22px;font-weight:700;letter-spacing:2px;background:#f4f5f7;padding:14px;border-radius:8px;text-align:center">${tempPassword}</p>
          <p style="color:#6b7280;font-size:12px">Se você não solicitou, ignore este e-mail.</p>
        </div>`,
    }),
  }).catch(() => {});
}
