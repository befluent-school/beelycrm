/**
 * Lógica de negócio de autenticação — login, cadastro, reset de senha,
 * sign-in com Google. Orquestra os primitivos (password.ts, tokens.ts,
 * session.ts, mailer.ts) contra o banco (users/sessions/auth_tokens).
 */
import { eq } from "drizzle-orm";
import { db as client, schema } from "@/db";
import { hashPassword, verifyPassword } from "./password";
import { randomToken, sha256 } from "./tokens";
import { createSession, revokeAllSessions } from "./session";
import { sendMail, emailLayout } from "./mailer";
import { env } from "@/lib/env";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

function requireDb() {
  if (!client) throw new Error("DATABASE_URL não configurado");
  return client;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  token?: string;
  userId?: string;
}

/* ─── Login e-mail/senha ─────────────────────────────────── */
export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  const db = requireDb();
  const normalized = normalizeEmail(email);

  const rows = await db.select().from(schema.users).where(eq(schema.users.email, normalized)).limit(1);
  const user = rows[0];

  // verifyPassword roda a derivação "dummy" mesmo com stored=null — mantém
  // o tempo de resposta constante entre "não existe" e "senha errada"
  // (não revela por timing se o e-mail está cadastrado).
  const valid = await verifyPassword(password, user?.passwordHash);
  if (!user || !valid || user.deletedAt) {
    return { ok: false, error: "E-mail ou senha inválidos." };
  }

  const token = await createSession(user.id);
  return { ok: true, token, userId: user.id };
}

/* ─── Cadastro ───────────────────────────────────────────── */
export async function signup(email: string, password: string, name: string): Promise<LoginResult> {
  const db = requireDb();
  const normalized = normalizeEmail(email);

  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, normalized)).limit(1);
  if (existing.length > 0) {
    return { ok: false, error: "Já existe uma conta com este e-mail." };
  }

  const passwordHash = await hashPassword(password);
  const inserted = await db.insert(schema.users).values({
    email: normalized,
    passwordHash,
    name: name.trim() || null,
  }).returning({ id: schema.users.id });

  const userId = inserted[0].id;
  const token = await createSession(userId);
  return { ok: true, token, userId };
}

/* ─── Troca de senha (usuário logado) ───────────────────── */
export async function changePassword(userId: string, newPassword: string, currentSessionToken?: string): Promise<{ ok: boolean; error?: string }> {
  const db = requireDb();
  const passwordHash = await hashPassword(newPassword);

  await db.update(schema.users).set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
    .where(eq(schema.users.id, userId));

  // Derruba as outras sessões (dispositivos antigos) — mantém a sessão
  // atual logada criando uma nova depois, já que revokeAllSessions apaga
  // todas. O caller decide se precisa gerar sessão nova.
  await revokeAllSessions(userId);
  void currentSessionToken; // reservado — hoje revoga tudo, inclusive a atual, por simplicidade

  return { ok: true };
}

/* ─── Esqueci minha senha — gera link de uso único ──────── */
export async function requestPasswordReset(email: string): Promise<void> {
  const db = requireDb();
  const normalized = normalizeEmail(email);

  const rows = await db.select().from(schema.users).where(eq(schema.users.email, normalized)).limit(1);
  const user = rows[0];
  // Sempre silencioso — não revela se o e-mail existe na base.
  if (!user || user.deletedAt) return;

  const token = randomToken();
  await db.insert(schema.authTokens).values({
    userId: user.id,
    type: "password_reset",
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });

  const link = `${env.appUrl}/nova-senha?token=${token}`;
  await sendMail({
    to: normalized,
    subject: "Redefinir sua senha",
    html: emailLayout("Redefinir senha", `
      <p>Clique no botão abaixo para definir uma nova senha. Este link funciona uma única vez e expira em 1 hora.</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${link}" style="display:inline-block;background:#E59313;color:#fff;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none">Definir nova senha</a>
      </p>
      <p style="color:#6b7280;font-size:12px">Se você não solicitou, ignore este e-mail — sua senha atual continua válida.</p>
    `),
  });
}

/** Valida e consome um token de reset — devolve o userId se válido. */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const db = requireDb();
  const tokenHash = sha256(token);

  const rows = await db.select().from(schema.authTokens).where(eq(schema.authTokens.tokenHash, tokenHash)).limit(1);
  const row = rows[0];

  if (!row || row.type !== "password_reset" || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Link inválido ou expirado. Solicite um novo." };
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(schema.users).set({ passwordHash, emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.users.id, row.userId));
  await db.update(schema.authTokens).set({ usedAt: new Date() }).where(eq(schema.authTokens.id, row.id));
  await revokeAllSessions(row.userId);

  return { ok: true };
}

/* ─── Sign-in com Google ─────────────────────────────────── */
export async function signInWithGoogle(googleId: string, email: string, name?: string): Promise<LoginResult> {
  const db = requireDb();
  const normalized = normalizeEmail(email);

  let rows = await db.select().from(schema.users).where(eq(schema.users.googleId, googleId)).limit(1);
  let user = rows[0];

  if (!user) {
    // Tenta casar por e-mail verificado (conta criada antes via senha, ou
    // Google com outro sub por algum motivo) e vincula o googleId a ela.
    rows = await db.select().from(schema.users).where(eq(schema.users.email, normalized)).limit(1);
    user = rows[0];

    if (user) {
      await db.update(schema.users).set({ googleId, emailVerifiedAt: user.emailVerifiedAt ?? new Date(), updatedAt: new Date() })
        .where(eq(schema.users.id, user.id));
    } else {
      const inserted = await db.insert(schema.users).values({
        email: normalized,
        googleId,
        name: name ?? null,
        emailVerifiedAt: new Date(),
      }).returning();
      user = inserted[0];
    }
  }

  if (user.deletedAt) {
    return { ok: false, error: "Conta desativada." };
  }

  const token = await createSession(user.id);
  return { ok: true, token, userId: user.id };
}
