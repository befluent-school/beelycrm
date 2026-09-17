"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CopyField } from "@/components/app/copy-field";
import { useStore, type Sdr, type WaProvider } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Info, ExternalLink, Trash2, PlugZap, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

const PROVIDER_INFO: Record<WaProvider, { label: string; guide: string[]; link?: string; linkLabel?: string }> = {
  zapi: {
    label: "Z-API",
    guide: [
      "Crie uma instância em app.z-api.io e escaneie o QR Code com o WhatsApp deste SDR.",
      "Copie o Instance ID e o Token exibidos no painel da instância.",
      "Se sua conta usa Client-Token de segurança, copie-o em Segurança > Client-Token.",
      "Cole os três valores abaixo e salve.",
      "Depois de salvar, copie a URL do webhook exibida e cole em Instância > Webhooks > Ao receber (e também Ao enviar, para capturar mensagens do celular).",
    ],
    link: "https://app.z-api.io",
    linkLabel: "Abrir painel Z-API",
  },
  meta_cloud: {
    label: "Meta Cloud API (oficial)",
    guide: [
      "Acesse business.facebook.com e crie um App do tipo Business.",
      "Adicione o produto \"WhatsApp\" ao App.",
      "Em WhatsApp > Configuração da API, copie o Phone Number ID e o WhatsApp Business Account ID.",
      "Gere um Access Token permanente em Usuários do Sistema > Gerar token.",
      "Defina um Verify Token (qualquer texto secreto) — será usado na verificação do webhook.",
      "Cole os quatro valores abaixo e salve.",
      "Depois de salvar, cole a URL do webhook exibida em WhatsApp > Configuração > Webhook, junto com o Verify Token definido.",
    ],
    link: "https://business.facebook.com",
    linkLabel: "Abrir Meta Business Suite",
  },
};

export function SdrConnect({
  sdr,
  open,
  onOpenChange,
}: {
  sdr: Sdr | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const addSdr = useStore((s) => s.addSdr);
  const updateSdr = useStore((s) => s.updateSdr);
  const deleteSdr = useStore((s) => s.deleteSdr);

  const [name, setName] = useState(sdr?.name ?? "");
  const [email, setEmail] = useState(sdr?.email ?? "");
  const [phoneDisplay, setPhoneDisplay] = useState(sdr?.phoneDisplay ?? "");
  const [active, setActive] = useState(sdr?.active ?? true);
  const [provider, setProvider] = useState<WaProvider>(sdr?.waProvider ?? "zapi");
  const [zapiInstanceId, setZapiInstanceId] = useState(sdr?.zapiInstanceId ?? "");
  const [zapiToken, setZapiToken] = useState(sdr?.zapiToken ?? "");
  const [zapiClientToken, setZapiClientToken] = useState(sdr?.zapiClientToken ?? "");
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState(sdr?.metaPhoneNumberId ?? "");
  const [metaAccessToken, setMetaAccessToken] = useState(sdr?.metaAccessToken ?? "");
  const [metaWabaId, setMetaWabaId] = useState(sdr?.metaWabaId ?? "");
  const [metaVerifyToken, setMetaVerifyToken] = useState(sdr?.metaVerifyToken ?? "");
  const [showGuide, setShowGuide] = useState(!sdr);
  const [savedId, setSavedId] = useState<string | null>(sdr?.id ?? null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const info = PROVIDER_INFO[provider];

  function reset() {
    setName(""); setEmail(""); setPhoneDisplay(""); setActive(true);
    setProvider("zapi"); setZapiInstanceId(""); setZapiToken(""); setZapiClientToken("");
    setMetaPhoneNumberId(""); setMetaAccessToken(""); setMetaWabaId(""); setMetaVerifyToken("");
    setSavedId(null); setShowGuide(true); setTestResult(null);
  }

  /** Bate direto na API do provedor — evita salvar credencial errada sem aviso. */
  async function testConnection(): Promise<{ ok: boolean; message: string }> {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/sdrs/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waProvider: provider,
          zapiInstanceId, zapiToken, zapiClientToken,
          metaPhoneNumberId, metaAccessToken,
        }),
      });
      const data = await res.json();
      const result = data.ok
        ? { ok: true, message: data.detail ?? "Conexão confirmada." }
        : { ok: false, message: data.error ?? "Falha desconhecida." };
      setTestResult(result);
      return result;
    } catch (e) {
      const result = { ok: false, message: e instanceof Error ? e.message : String(e) };
      setTestResult(result);
      return result;
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    if (!name.trim()) return toast.error("Informe o nome do SDR.");

    const hasCreds = provider === "meta_cloud"
      ? !!(metaPhoneNumberId.trim() && metaAccessToken.trim())
      : !!(zapiInstanceId.trim() && zapiToken.trim());

    if (hasCreds) {
      setSaving(true);
      const result = await testConnection();
      setSaving(false);
      if (!result.ok && !confirm(`Não foi possível confirmar a conexão com o WhatsApp:\n\n${result.message}\n\nSalvar mesmo assim?`)) {
        return;
      }
    }

    const patch: Omit<Sdr, "id" | "createdAt"> = {
      name: name.trim(), email: email.trim() || undefined, phoneDisplay: phoneDisplay.trim() || undefined,
      active, waProvider: provider,
      zapiInstanceId: zapiInstanceId.trim() || undefined,
      zapiToken: zapiToken.trim() || undefined,
      zapiClientToken: zapiClientToken.trim() || undefined,
      metaPhoneNumberId: metaPhoneNumberId.trim() || undefined,
      metaAccessToken: metaAccessToken.trim() || undefined,
      metaWabaId: metaWabaId.trim() || undefined,
      metaVerifyToken: metaVerifyToken.trim() || undefined,
    };

    if (savedId) {
      updateSdr(savedId, patch);
      toast.success("SDR atualizado.");
    } else {
      const id = addSdr(patch);
      setSavedId(id);
      toast.success("SDR criado. Copie a URL do webhook abaixo e configure no provedor.");
    }

    // Confirma que a gravação chegou de verdade ao Supabase (não só ao localStorage) —
    // é exatamente essa falha silenciosa que fazia o webhook nunca achar o SDR.
    void confirmPersisted();
  }

  async function confirmPersisted() {
    try {
      const res = await fetch("/api/debug/supabase-status");
      const data = await res.json();
      const sdrsTable = data?.tables?.sdrs;
      if (sdrsTable && sdrsTable.exists === false) {
        toast.error("O SDR foi salvo só no seu navegador — a tabela \"sdrs\" não existe no Supabase. Rode supabase-setup.sql no SQL Editor.", { duration: 8000 });
      }
    } catch {
      /* diagnóstico best-effort, não bloqueia o fluxo */
    }
  }

  function handleDelete() {
    if (!savedId) return;
    if (!confirm(`Remover o SDR "${name}"? Contatos já atribuídos mantêm o vínculo, mas o WhatsApp deixa de funcionar.`)) return;
    deleteSdr(savedId);
    toast.success("SDR removido.");
    onOpenChange(false);
    reset();
  }

  const webhookUrl = savedId ? `${appUrl}/api/webhooks/whatsapp/${savedId}` : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{savedId ? "Gerenciar SDR" : "Novo SDR"}</DialogTitle>
          <DialogDescription>Cada SDR atende pelo próprio número de WhatsApp Business.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Carlos Mendes" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail (opcional)</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="carlos@befluent.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Número exibido</Label>
              <Input value={phoneDisplay} onChange={(e) => setPhoneDisplay(e.target.value)} placeholder="+55 12 99999-9999" />
            </div>
            <div className="space-y-1.5">
              <Label className="block">Ativo</Label>
              <div className="flex h-10 items-center gap-2">
                <Switch checked={active} onCheckedChange={setActive} />
                <span className="text-xs text-muted-foreground">{active ? "Recebe leads" : "Pausado"}</span>
              </div>
            </div>
          </div>

          {/* Provedor de WhatsApp */}
          <div className="space-y-2 border-t border-border/60 pt-4">
            <Label>Provedor de WhatsApp</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["zapi", "meta_cloud"] as WaProvider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    provider === p ? "border-primary/60 bg-primary/10 text-primary" : "border-border hover:bg-white/[0.03]"
                  )}
                >
                  {PROVIDER_INFO[p].label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              className="flex items-center gap-2 text-xs text-primary hover:underline"
            >
              <Info className="size-3.5" /> {showGuide ? "Ocultar guia" : "Ver guia de configuração"}
            </button>
            {showGuide && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5">
                <ol className="space-y-1.5">
                  {info.guide.map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="size-4 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                {info.link && (
                  <a href={info.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                    <ExternalLink className="size-3" /> {info.linkLabel ?? info.link}
                  </a>
                )}
              </div>
            )}

            {provider === "zapi" ? (
              <div className="space-y-2.5">
                <F label="Instance ID" value={zapiInstanceId} onChange={setZapiInstanceId} placeholder="3D8..." />
                <F label="Token" value={zapiToken} onChange={setZapiToken} placeholder="A1B2C3..." />
                <F label="Client-Token (opcional)" value={zapiClientToken} onChange={setZapiClientToken} placeholder="F...." />
              </div>
            ) : (
              <div className="space-y-2.5">
                <F label="Phone Number ID" value={metaPhoneNumberId} onChange={setMetaPhoneNumberId} placeholder="1029384756123" />
                <F label="Access Token" value={metaAccessToken} onChange={setMetaAccessToken} placeholder="EAAB..." />
                <F label="WhatsApp Business Account ID" value={metaWabaId} onChange={setMetaWabaId} placeholder="1234567890" />
                <F label="Verify Token" value={metaVerifyToken} onChange={setMetaVerifyToken} placeholder="beely-verify-123" />
              </div>
            )}

            <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={testConnection} disabled={testing}>
              {testing ? <Loader2 className="size-3.5 animate-spin" /> : <PlugZap className="size-3.5" />}
              Testar conexão agora
            </Button>

            {testResult && (
              <div className={cn(
                "flex items-start gap-2 rounded-lg border p-2.5 text-xs",
                testResult.ok ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-destructive/40 bg-destructive/10 text-destructive"
              )}>
                {testResult.ok ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {webhookUrl && (
            <div className="space-y-1.5 border-t border-border/60 pt-4">
              <Label>URL do Webhook (cole no painel do provedor)</Label>
              <CopyField value={webhookUrl} />
              <p className="text-[10px] text-muted-foreground">
                Credenciais salvas no seu banco Supabase — não há cofre de segredo dedicado nesta versão; não exponha esta chave publicamente.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {savedId && (
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="size-3.5" /> Remover
              </Button>
            )}
            <Button className="flex-1" onClick={save} disabled={saving}>
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {savedId ? "Salvar alterações" : "Criar SDR"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9" />
    </div>
  );
}

export function SdrBadge({ sdr }: { sdr: Sdr }) {
  return (
    <Badge variant={sdr.active ? "success" : "outline"} className="gap-1">
      {sdr.active ? "Ativo" : "Pausado"}
    </Badge>
  );
}
