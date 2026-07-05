/**
 * In-memory message store para bridge webhook → SSE → frontend.
 * Funciona no mesmo processo Node.js do Next.js.
 * Em produção com múltiplos workers, usar Redis ou banco.
 */

export interface InboxMessage {
  id: string;
  channel: "whatsapp" | "instagram" | "messenger";
  from: string;         // número ou ID do remetente
  fromName: string;     // nome do contato (se disponível)
  text: string;
  timestamp: number;    // epoch ms
  raw?: unknown;        // payload original para debugging
}

// Store global no processo Node
const messages: InboxMessage[] = [];
const MAX_MESSAGES = 500;

// SSE listeners
type Listener = (msg: InboxMessage) => void;
const listeners = new Set<Listener>();

export function pushMessage(msg: Omit<InboxMessage, "id">): InboxMessage {
  const full: InboxMessage = { ...msg, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  messages.push(full);
  if (messages.length > MAX_MESSAGES) messages.splice(0, messages.length - MAX_MESSAGES);
  listeners.forEach((fn) => fn(full));
  return full;
}

export function getRecentMessages(since?: number): InboxMessage[] {
  if (since == null) return messages.slice(-100);
  return messages.filter((m) => m.timestamp > since);
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
