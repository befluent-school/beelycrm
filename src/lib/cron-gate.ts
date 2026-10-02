import { NextResponse } from "next/server";

/**
 * Gate dos crons (/api/cron/*) — antes, sem CRON_SECRET configurado, a rota
 * ficava totalmente aberta (fail-open "porque o botão manual não precisa
 * dela"). Essas rotas enviam mensagem de verdade e mudam estágio/status de
 * negócios — ficar aberta por esquecimento de configurar a env var permite
 * qualquer requisição anônima disparar follow-ups reais repetidamente.
 *
 * Em produção, exige CRON_SECRET configurado e correto — fail-closed se a
 * env var estiver ausente. Fora de produção (dev/demo local), mantém o
 * comportamento permissivo de antes para não travar o botão manual sem
 * segredo configurado localmente.
 */
export function cronGateOrResponse(request: Request): NextResponse | null {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret") ?? request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !expected) {
    console.error("[cron-gate] CRON_SECRET não configurado em produção — bloqueando por padrão (fail-closed).");
    return NextResponse.json({ error: "cron_secret_not_configured" }, { status: 503 });
  }
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
