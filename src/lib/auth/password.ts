/**
 * Hash de senha com scrypt nativo do Node (sem dependência externa como
 * bcrypt/argon2) — mesmos parâmetros já validados em produção pelo BeeFlow.
 *
 * Formato auto-descritivo: scrypt$<logN>$<r>$<p>$<saltB64>$<hashB64> —
 * permite subir o custo (logN) no futuro sem invalidar hashes antigos,
 * porque cada hash carrega os parâmetros usados para gerá-lo.
 */
import { scrypt, randomBytes, timingSafeEqual } from "crypto";

const LOG_N = 15; // N = 2^15 = 32768
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

// Salt fixo só para a derivação "dummy" (comparação de timing constante
// quando o usuário não existe) — nunca usado para hash real.
const DUMMY_SALT = Buffer.from("beely-dummy-salt-timing-safe-compare");

function derive(password: string, salt: Buffer, logN = LOG_N, r = R, p = P): Promise<Buffer> {
  const N = 2 ** logN;
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { N, r, p, maxmem: 256 * N * r }, (err, derivedKey) => {
      if (err) reject(err); else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  return `scrypt$${LOG_N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/**
 * Verifica a senha contra o hash armazenado. Se `stored` for null/undefined
 * (usuário não encontrado, ou conta só-Google sem senha própria), ainda
 * assim roda uma derivação "dummy" com parâmetros fixos antes de retornar
 * false — mantém o tempo de resposta constante entre "usuário não existe" e
 * "senha errada", evitando enumeração de e-mails cadastrados por timing.
 */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) {
    await derive(password, DUMMY_SALT, LOG_N, R, P);
    return false;
  }

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    await derive(password, DUMMY_SALT, LOG_N, R, P);
    return false;
  }

  const [, logNStr, rStr, pStr, saltB64, hashB64] = parts;
  const logN = Number(logNStr);
  const r = Number(rStr);
  const p = Number(pStr);
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");

  const actual = await derive(password, salt, logN, r, p);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
