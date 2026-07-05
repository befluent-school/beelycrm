/**
 * Message store com persistência em arquivo JSON.
 * Compatível com Render free tier (filesystem efêmero mas funciona
 * dentro da mesma instância ativa).
 *
 * Arquitetura: webhook POST → arquivo JSON → frontend polling GET
 */

import fs from "fs";
import path from "path";
import os from "os";

export interface InboxMessage {
  id: string;
  channel: "whatsapp" | "instagram" | "messenger";
  from: string;
  fromName: string;
  text: string;
  timestamp: number;
  raw?: unknown;
}

const DATA_DIR  = process.env.DATA_DIR ?? path.join(os.tmpdir(), "beely-inbox");
const DATA_FILE = path.join(DATA_DIR, "messages.json");
const MAX_MESSAGES = 200;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll(): InboxMessage[] {
  try {
    ensureDir();
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw) as InboxMessage[];
  } catch {
    return [];
  }
}

function writeAll(msgs: InboxMessage[]) {
  try {
    ensureDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(msgs), "utf8");
  } catch (e) {
    console.error("[message-store] erro ao salvar:", e);
  }
}

export function pushMessage(msg: Omit<InboxMessage, "id">): InboxMessage {
  const full: InboxMessage = {
    ...msg,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    // não salva raw no arquivo para economizar espaço
    raw: undefined,
  };
  const all = readAll();
  all.push(full);
  const trimmed = all.slice(-MAX_MESSAGES);
  writeAll(trimmed);
  console.log(`[message-store] +1 msg de ${full.fromName} (${full.channel}) — total: ${trimmed.length}`);
  return full;
}

export function getRecentMessages(since?: number): InboxMessage[] {
  const all = readAll();
  if (since == null || since === 0) return all.slice(-100);
  return all.filter((m) => m.timestamp > since);
}

export function getAllMessages(): InboxMessage[] {
  return readAll();
}
