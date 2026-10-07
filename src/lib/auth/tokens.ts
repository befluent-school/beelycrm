/**
 * Primitivas de token — usadas tanto para o cookie de sessão quanto para
 * links de reset de senha. O valor bruto nunca é persistido: só o hash
 * SHA-256 vai para o banco (sessions.tokenHash, auth_tokens.tokenHash).
 */
import { randomBytes, createHash, createHmac, timingSafeEqual as nodeTimingSafeEqual } from "crypto";
import { env } from "@/lib/env";

/** 256 bits de entropia, base64url — usado como token bruto (cookie ou link). */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** HMAC-SHA256 com APP_SECRET — disponível para outros usos de valor assinado. */
export function hmac(value: string): string {
  return createHmac("sha256", env.appSecret).update(value).digest("base64url");
}

/** Comparação em tempo constante — usada por exemplo para o `state` do OAuth. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return nodeTimingSafeEqual(bufA, bufB);
}
