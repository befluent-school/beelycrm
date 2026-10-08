/**
 * Roda uma vez quando o servidor Next.js inicia (deploy, pm2 restart/reload).
 * Usado para reconectar as sessões do WhatsApp Lite que já tinham sido
 * pareadas antes do restart — sem isso, cada restart do PM2 exigiria
 * escanear o QR Code de novo.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { restoreAllSessions } = await import("@/lib/wa-lite/session-manager");
  await restoreAllSessions();
}
