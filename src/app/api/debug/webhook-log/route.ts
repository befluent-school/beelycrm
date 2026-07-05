/**
 * Endpoint de debug: loga todos os payloads recebidos.
 * Use a URL /api/debug/webhook-log no Z-API para capturar o formato real.
 * GET /api/debug/webhook-log → retorna os últimos payloads recebidos
 * POST /api/debug/webhook-log → salva o payload e retorna 200
 * DELETE /api/debug/webhook-log → limpa o log
 */

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

const LOG_DIR  = process.env.DATA_DIR ?? path.join(os.tmpdir(), "beely-inbox");
const LOG_FILE = path.join(LOG_DIR, "webhook-debug.json");
const MAX_ENTRIES = 20;

function readLog(): { ts: string; headers: Record<string, string>; body: unknown }[] {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    if (!fs.existsSync(LOG_FILE)) return [];
    return JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  } catch { return []; }
}

function writeLog(entries: { ts: string; headers: Record<string, string>; body: unknown }[]) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.writeFileSync(LOG_FILE, JSON.stringify(entries.slice(-MAX_ENTRIES), null, 2), "utf8");
  } catch (e) { console.error("[debug-log] erro:", e); }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { body = rawBody; }

  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k] = v; });

  const entry = { ts: new Date().toISOString(), headers, body };
  console.log("[debug-webhook] payload recebido:", JSON.stringify(body, null, 2));

  const log = readLog();
  log.push(entry);
  writeLog(log);

  return NextResponse.json({ received: true, ts: entry.ts });
}

export async function GET() {
  const log = readLog();
  return NextResponse.json({ count: log.length, entries: log.slice(-10) });
}

export async function DELETE() {
  writeLog([]);
  return NextResponse.json({ cleared: true });
}
