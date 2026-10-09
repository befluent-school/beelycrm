/**
 * Roda uma vez quando o servidor Next.js inicia (deploy, pm2 restart/reload).
 * Usado para reconectar as sessões do WhatsApp Lite que já tinham sido
 * pareadas antes do restart — sem isso, cada restart do PM2 exigiria
 * escanear o QR Code de novo.
 *
 * Import DINÂMICO de propósito — instrumentation.ts é compilado tanto pro
 * bundle Node quanto pro Edge; um import estático no topo faz o Turbopack
 * tentar resolver a cadeia inteira (session-manager → baileys → sharp,
 * nativo) também pro Edge, que quebra o build ("non-ecmascript placeable
 * asset"). O guard de runtime abaixo também evita rodar isso 2x (uma vez
 * por bundle) — sem ele, cada restart do PM2 tentava reconectar a mesma
 * sessão duas vezes.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { restoreAllSessions } = await import("@/lib/wa-lite/session-manager");
  await restoreAllSessions();
}
