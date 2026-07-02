import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";

/**
 * API Keys — geração e listagem.
 *
 * POST /api/v1/api-keys  → gera nova chave
 * GET  /api/v1/api-keys  → lista chaves da conta (sem revelar o valor completo)
 *
 * Em modo demo (sem banco de dados), gera a chave no servidor com entropia real
 * e retorna o valor completo UMA ÚNICA VEZ — nunca é armazenado em texto claro.
 *
 * Em produção: armazene apenas o hash SHA-256 da chave no banco de dados.
 * Nunca armazene o valor em texto claro.
 */

function generateApiKey(prefix: "live" | "test" = "live"): string {
  // 32 bytes de entropia → 64 chars hex
  const entropy = randomBytes(32).toString("hex");
  // Prefixo legível: bly_live_... ou bly_test_...
  return `bly_${prefix}_${entropy}`;
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const callerKey = auth.replace(/^Bearer\s+/i, "").trim();

  // Em produção: valide que callerKey é uma chave Owner da conta
  // Em demo: aceita qualquer chave bly_ ou sem chave (usuário autenticado no painel)
  const isDemoOrAuthed = callerKey.startsWith("bly_") || !callerKey;
  if (!isDemoOrAuthed && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { name?: string; env?: "live" | "test" };
  const name  = body.name ?? "Nova chave";
  const env   = body.env === "test" ? "test" : "live";

  const key     = generateApiKey(env);
  const keyHash = hashKey(key);
  const prefix  = key.slice(0, 16); // bly_live_XXXXXXXX

  return NextResponse.json({
    object:     "api_key",
    name,
    key,           // ← retornado APENAS nesta chamada; nunca mais exibido
    key_hash:   keyHash,
    prefix,
    environment: env,
    created_at: new Date().toISOString(),
    last_used:  null,
    note: "Copie a chave agora. Ela não será exibida novamente. Armazene o hash no banco de dados.",
  }, { status: 201 });
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const key  = auth.replace(/^Bearer\s+/i, "").trim();

  if (!key.startsWith("bly_")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Em demo: retorna lista simulada de chaves
  return NextResponse.json({
    object: "list",
    data: [
      { prefix: "bly_live_8Kd2xY7p", name: "Produção",       created_at: "2026-05-12T10:00:00Z", last_used: "2026-07-01T08:00:00Z", environment: "live" },
      { prefix: "bly_live_Qa91mB3n", name: "N8N — Automação", created_at: "2026-05-03T14:00:00Z", last_used: "2026-06-30T22:00:00Z", environment: "live" },
    ],
    has_more: false,
  });
}
