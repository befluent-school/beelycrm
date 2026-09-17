/**
 * Resolve o telefone real de um contato quando o webhook da Z-API só
 * informa um LID (identificador interno do WhatsApp) em vez do número —
 * o que acontece em mensagens fromMe=true enviadas diretamente pelo
 * WhatsApp do celular (fora da API), nessa conta específica.
 *
 * Estratégia: a Z-API expõe GET /instances/{id}/token/{token}/chats,
 * que lista as conversas ativas da instância com o telefone REAL de
 * cada uma e o timestamp da última mensagem. Como a mensagem acabou de
 * ser enviada, o chat correspondente é o que tem o lastMessageTime mais
 * recente — em geral o próprio topo da lista.
 */

import type { Sdr } from "@/lib/store";

interface ZApiChat {
  phone: string;
  name?: string;
  lastMessageTime?: string | number;
}

/**
 * Credenciais Z-API a usar: as de um SDR específico (Inbox multi-SDR) ou,
 * se omitido, as env vars globais (comportamento legado de instância única).
 */
interface ZApiCreds {
  instanceId?: string;
  token?: string;
  clientToken?: string;
}

function credsFromSdr(sdr?: Sdr | null): ZApiCreds {
  if (sdr) {
    return {
      instanceId: sdr.zapiInstanceId,
      token: sdr.zapiToken,
      clientToken: sdr.zapiClientToken,
    };
  }
  return {
    instanceId: process.env.ZAPI_INSTANCE_ID,
    token: process.env.ZAPI_TOKEN,
    clientToken: process.env.ZAPI_CLIENT_TOKEN,
  };
}

/**
 * Busca o chat mais recente na instância Z-API e retorna seu telefone real.
 * Usado para mensagens fromMe=true que chegam com LID no campo phone.
 */
export async function resolveRecentChatPhone(sdr?: Sdr | null): Promise<{ phone: string; name?: string } | null> {
  const { instanceId, token, clientToken } = credsFromSdr(sdr);
  if (!instanceId || !token) return null;

  try {
    const headers: Record<string, string> = {};
    if (clientToken) headers["Client-Token"] = clientToken;

    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/chats?page=1&pageSize=5`,
      { headers }
    );
    if (!res.ok) {
      console.error("[zapi-resolve] erro ao buscar chats:", res.status, await res.text());
      return null;
    }

    const chats = (await res.json()) as ZApiChat[];
    if (!Array.isArray(chats) || chats.length === 0) return null;

    // Ordena pelo lastMessageTime mais recente — é o chat que acabou de
    // receber a mensagem que estamos processando.
    const sorted = [...chats].sort(
      (a, b) => Number(b.lastMessageTime ?? 0) - Number(a.lastMessageTime ?? 0)
    );
    const top = sorted[0];
    if (!top?.phone) return null;

    return { phone: top.phone, name: top.name };
  } catch (e) {
    console.error("[zapi-resolve] falha ao chamar Z-API chats:", e);
    return null;
  }
}
