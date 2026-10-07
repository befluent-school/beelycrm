/**
 * Sessão própria em cookie opaco — substitui o Supabase Auth. Mesmo padrão
 * validado em produção pelo BeeFlow: token aleatório de 256 bits no cookie
 * (httpOnly), só o SHA-256 dele é persistido no banco (sessions.tokenHash)
 * — uma leitura do banco nunca revela um token utilizável.
 */
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db as client, schema } from "@/db";
import { env } from "@/lib/env";
import { randomToken, sha256 } from "./tokens";

export const SESSION_COOKIE = "beely_session_token";
const TOUCH_EVERY_MS = 60 * 60 * 1000; // só atualiza lastUsedAt 1x/hora (evita write em todo request)

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface SessionInfo {
  sessionId: string;
  user: AuthUser;
}

function requireDb() {
  if (!client) throw new Error("DATABASE_URL não configurado");
  return client;
}

/** Cria a sessão no banco e devolve o token BRUTO (vai no cookie, nunca persistido). */
export async function createSession(
  userId: string,
  meta: { ipAddress?: string | null; userAgent?: string | null } = {}
): Promise<string> {
  const db = requireDb();
  const token = randomToken();
  const expiresAt = new Date(Date.now() + env.sessionDays * 24 * 60 * 60 * 1000);

  await db.insert(schema.sessions).values({
    userId,
    tokenHash: sha256(token),
    expiresAt,
    ipAddress: meta.ipAddress ?? null,
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
  });

  return token;
}

/** Grava o cookie de sessão na resposta atual (Server Action / Route Handler). */
export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.appUrl.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: env.sessionDays * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Resolve a sessão a partir do token bruto (do cookie) — valida existência, expiração e usuário ativo. */
export async function resolveSession(token: string | undefined | null): Promise<SessionInfo | null> {
  if (!token || !client) return null;
  const db = client;

  const rows = await db.select({
    sessionId: schema.sessions.id,
    expiresAt: schema.sessions.expiresAt,
    lastUsedAt: schema.sessions.lastUsedAt,
    userId: schema.users.id,
    email: schema.users.email,
    name: schema.users.name,
    deletedAt: schema.users.deletedAt,
  })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(eq(schema.sessions.tokenHash, sha256(token)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.deletedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;

  // Sliding expiry: só grava se fizer tempo desde o último touch — evita
  // um UPDATE a cada request autenticado.
  if (Date.now() - row.lastUsedAt.getTime() > TOUCH_EVERY_MS) {
    const newExpiresAt = new Date(Date.now() + env.sessionDays * 24 * 60 * 60 * 1000);
    void db.update(schema.sessions)
      .set({ lastUsedAt: new Date(), expiresAt: newExpiresAt })
      .where(eq(schema.sessions.id, row.sessionId))
      .catch((e) => console.error("[session] falha ao atualizar lastUsedAt:", e));
  }

  return {
    sessionId: row.sessionId,
    user: { id: row.userId, email: row.email, name: row.name },
  };
}

/** Lê o cookie da requisição atual e resolve a sessão — helper para Server Components/Actions. */
export async function getCurrentSession(): Promise<SessionInfo | null> {
  const store = await cookies();
  return resolveSession(store.get(SESSION_COOKIE)?.value);
}

export async function revokeSession(token: string): Promise<void> {
  const db = requireDb();
  await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha256(token)));
}

/** Derruba todas as sessões de um usuário — usado em reset/troca de senha. */
export async function revokeAllSessions(userId: string): Promise<void> {
  const db = requireDb();
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}
