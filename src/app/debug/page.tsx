"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface LogEntry {
  id: number;
  ts: string;
  body: unknown;
}

export default function DebugPage() {
  const [entries, setEntries]     = useState<LogEntry[]>([]);
  const [loading, setLoading]     = useState(false);
  const [testResult, setTestResult] = useState<string>("");
  const [sendResult, setSendResult] = useState<string>("");
  const [phone, setPhone]         = useState("");
  const [msg, setMsg]             = useState("Teste do Beely ✅");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/debug/webhook-log");
      const d = await r.json();
      setEntries(d.entries ?? []);
    } catch (e) {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  async function clear() {
    await fetch("/api/debug/webhook-log", { method: "DELETE" });
    setEntries([]);
  }

  async function testSend() {
    if (!phone) return;
    setSendResult("Enviando...");
    try {
      const r = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, text: msg }),
      });
      const d = await r.json();
      setSendResult(JSON.stringify(d, null, 2));
    } catch (e) {
      setSendResult("Erro: " + String(e));
    }
  }

  async function testZapiDirect() {
    setTestResult("Testando...");
    try {
      const r = await fetch("/api/debug/zapi-status");
      const d = await r.json();
      setTestResult(JSON.stringify(d, null, 2));
    } catch (e) {
      setTestResult("Erro: " + String(e));
    }
  }

  useEffect(() => { load(); }, []);

  function highlight(body: unknown): string {
    const str = JSON.stringify(body, null, 2);
    return str;
  }

  function extract(body: unknown) {
    if (!body || typeof body !== "object") return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = body as any;
    return {
      phone:      String(b.phone ?? b.value?.phone ?? "—"),
      fromMe:     String(b.fromMe ?? b.value?.fromMe ?? "?"),
      text:       String(b.text?.message ?? b.value?.text?.message ?? "[sem texto]"),
      senderName: String(b.senderName ?? b.value?.senderName ?? "—"),
      type:       String(b.type ?? "—"),
      hasAudio:   !!b.audio,
      hasImage:   !!b.image,
    };
  }

  return (
    <div className="min-h-screen bg-[#0d1117] p-6 text-white font-mono text-sm">
      <h1 className="text-xl font-bold mb-1">🔍 Debug — Webhooks Z-API</h1>
      <p className="text-xs text-gray-400 mb-6">
        Configure esta URL no Z-API para debug:
        <code className="ml-2 bg-gray-800 px-2 py-0.5 rounded">
          https://beelycrm.onrender.com/api/debug/webhook-log
        </code>
      </p>

      {/* Teste de envio */}
      <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-4">
        <h2 className="font-bold mb-3 text-yellow-400">📤 Teste de Envio via /api/inbox/send</h2>
        <div className="flex gap-2 mb-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Número (ex: 5511999999999)"
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none"
          />
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Mensagem"
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none"
          />
          <button onClick={testSend} className="rounded-lg bg-yellow-500 px-4 py-2 text-black font-bold hover:bg-yellow-400">
            Enviar
          </button>
        </div>
        {sendResult && (
          <pre className="text-xs bg-gray-800 rounded p-3 mt-2 overflow-auto max-h-32 text-green-400">{sendResult}</pre>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-2 mb-4">
        <button onClick={load} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-500 disabled:opacity-50">
          {loading ? "Carregando..." : "↻ Atualizar"}
        </button>
        <button onClick={clear} className="rounded-lg bg-red-700 px-4 py-2 hover:bg-red-600">
          🗑 Limpar log
        </button>
        <span className="ml-auto text-xs text-gray-500 self-center">
          {entries.length} webhook{entries.length !== 1 ? "s" : ""} recebido{entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Nenhum webhook */}
      {entries.length === 0 && !loading && (
        <div className="rounded-xl border border-dashed border-gray-700 p-10 text-center text-gray-500">
          <p className="text-lg">Nenhum webhook recebido ainda.</p>
          <p className="text-xs mt-2">
            Configure a URL acima no Z-API e mande uma mensagem do WhatsApp.
          </p>
        </div>
      )}

      {/* Lista de webhooks */}
      <div className="space-y-3">
        {entries.map((e) => {
          const info = extract(e.body);
          const isFromMe = info?.fromMe === "true";
          return (
            <div key={e.id} className={`rounded-xl border p-4 ${isFromMe ? "border-green-700 bg-green-950/30" : "border-blue-700 bg-blue-950/20"}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isFromMe ? "bg-green-600 text-white" : "bg-blue-600 text-white"}`}>
                  {isFromMe ? "→ ENVIADO (fromMe)" : "← RECEBIDO"}
                </span>
                <span className="text-gray-400 text-xs">{e.ts}</span>
                <span className="text-gray-500 text-xs">id:{e.id}</span>
              </div>
              {info && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs mb-3">
                  <span><span className="text-gray-500">phone:</span> <span className="text-yellow-300">{String(info.phone)}</span></span>
                  <span><span className="text-gray-500">fromMe:</span> <span className={isFromMe ? "text-green-400" : "text-red-400"}>{info.fromMe}</span></span>
                  <span><span className="text-gray-500">nome:</span> <span className="text-white">{String(info.senderName)}</span></span>
                  <span><span className="text-gray-500">tipo:</span> <span className="text-purple-300">{String(info.type)} {info.hasAudio ? "🎤" : ""}{info.hasImage ? "🖼️" : ""}</span></span>
                  <span className="col-span-2"><span className="text-gray-500">texto:</span> <span className="text-white">&quot;{String(info.text)}&quot;</span></span>
                </div>
              )}
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-400">Ver JSON completo</summary>
                <pre className="mt-2 text-[10px] text-gray-400 overflow-auto max-h-48 bg-black/40 p-2 rounded">
                  {highlight(e.body)}
                </pre>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
