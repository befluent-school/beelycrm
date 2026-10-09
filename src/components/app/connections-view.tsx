"use client";

/**
 * Tela única de conexões — substitui as antigas abas "Canais" e "SDRs &
 * WhatsApp" de Configurações. WhatsApp passou a existir só pelo modelo por
 * SDR (sdr-connect.tsx, já suporta Z-API/Meta Cloud API/WhatsApp Lite via
 * QR Code) — o card de WhatsApp da antiga aba Canais foi removido porque
 * gravava num caminho paralelo (connected_channels) que o Inbox não lê de
 * verdade. Instagram e Messenger continuam no modelo antigo (1 conexão
 * global pra conta toda) por enquanto — ainda não têm um modelo por SDR.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChannelConnect } from "./channel-connect";
import { SdrConnect } from "./sdr-connect";
import { useStore, useHydrated, type Sdr } from "@/lib/store";
import { Plus, MessageSquare } from "lucide-react";

function InstagramLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <defs>
        <radialGradient id="conn-ig" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497"/>
          <stop offset="5%" stopColor="#fdf497"/>
          <stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/>
          <stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <rect width="48" height="48" rx="10" fill="url(#conn-ig)"/>
      <rect x="14" y="14" width="20" height="20" rx="6" stroke="white" strokeWidth="2.5" fill="none"/>
      <circle cx="24" cy="24" r="5" stroke="white" strokeWidth="2.5" fill="none"/>
      <circle cx="30.5" cy="17.5" r="1.5" fill="white"/>
    </svg>
  );
}
function MessengerLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="conn-msg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00B2FF"/>
          <stop offset="100%" stopColor="#006AFF"/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="10" fill="url(#conn-msg)"/>
      <path d="M24 10C16.27 10 10 15.9 10 23.2c0 4.18 2.08 7.9 5.34 10.38V38l4.84-2.66c1.28.36 2.66.56 4.08.56 7.73 0 14-5.9 14-13.2S31.73 10 24 10zm1.44 17.74l-3.56-3.8-6.94 3.8 7.64-8.1 3.64 3.8 6.86-3.8-7.64 8.1z" fill="white"/>
    </svg>
  );
}

const CHANNEL_DEFS = [
  { name: "Instagram Direct", Logo: InstagramLogo, type: "instagram" as const, providers: "Instagram Graph API" },
  { name: "Messenger",        Logo: MessengerLogo, type: "messenger" as const, providers: "Meta Messenger API" },
];

export function ConnectionsView() {
  const hydrated          = useHydrated();
  const connectedChannels = useStore((s) => s.connectedChannels);
  const sdrs               = useStore((s) => s.sdrs);

  const [sdrConnectOpen, setSdrConnectOpen] = useState(false);
  const [editingSdr, setEditingSdr]         = useState<Sdr | null>(null);

  return (
    <div className="space-y-8">
      {/* ─── WhatsApp (por SDR) ──────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold">WhatsApp</h3>
            <p className="text-sm text-muted-foreground">
              Cada SDR atende pelo próprio número (Z-API, Meta Cloud API ou WhatsApp Lite
              via QR Code). Conversas e leads aparecem no Inbox separados por SDR.
            </p>
          </div>
          <Button size="sm" onClick={() => { setEditingSdr(null); setSdrConnectOpen(true); }}>
            <Plus className="size-4" /> Novo SDR
          </Button>
        </div>

        {hydrated && sdrs.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              <MessageSquare className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">Nenhum SDR cadastrado ainda</p>
              <p className="text-xs text-muted-foreground">Adicione o primeiro SDR e conecte o WhatsApp dele.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {hydrated && sdrs.map((sdr) => (
            <Card key={sdr.id} className={sdr.active ? "border-success/30 bg-success/[0.03]" : ""}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span
                    className="flex size-11 items-center justify-center rounded-xl text-sm font-semibold text-white"
                    style={{ background: sdr.avatarColor || "#E59313" }}
                  >
                    {sdr.name.slice(0, 1).toUpperCase()}
                  </span>
                  <Badge variant={sdr.active ? "success" : "outline"}>{sdr.active ? "Ativo" : "Pausado"}</Badge>
                </div>
                <p className="mt-3 font-display font-semibold">{sdr.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{sdr.phoneDisplay || "Sem número exibido"}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {sdr.waProvider === "meta_cloud"
                    ? (sdr.metaPhoneNumberId ? "Meta Cloud API conectada" : "Meta Cloud API — pendente")
                    : sdr.waProvider === "wa_lite"
                    ? (sdr.waLiteStatus === "connected" ? "WhatsApp Lite conectado" : "WhatsApp Lite — pendente")
                    : (sdr.zapiInstanceId ? "Z-API conectada" : "Z-API — pendente")}
                </p>
                <Button
                  variant="outline" size="sm" className="mt-4 w-full"
                  onClick={() => { setEditingSdr(sdr); setSdrConnectOpen(true); }}
                >
                  Gerenciar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <SdrConnect key={editingSdr?.id ?? "new"} sdr={editingSdr} open={sdrConnectOpen} onOpenChange={setSdrConnectOpen} />
      </section>

      {/* ─── Instagram / Messenger ───────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="font-display font-semibold">Instagram & Messenger</h3>
          <p className="text-sm text-muted-foreground">
            Uma conexão por canal, compartilhada pela conta toda — ainda não têm modelo
            por SDR como o WhatsApp.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {CHANNEL_DEFS.map(({ name, Logo, type, providers }) => {
            const connected = hydrated && connectedChannels.some((c) => c.type === type);
            const ch        = connectedChannels.find((c) => c.type === type);
            return (
              <Card key={name} className={connected ? "border-success/30 bg-success/[0.03]" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <Logo className="size-11 rounded-xl" />
                    {connected ? <Badge variant="success">Conectado</Badge> : <Badge variant="outline">Desconectado</Badge>}
                  </div>
                  <p className="mt-3 font-display font-semibold">{name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{providers}</p>
                  {connected && ch && (
                    <p className="mt-1 text-[10px] text-success/80">via {ch.provider} · {new Date(ch.connectedAt).toLocaleDateString("pt-BR")}</p>
                  )}
                  <ChannelConnect
                    channel={name}
                    connected={connected}
                    trigger={
                      <Button variant={connected ? "outline" : "default"} size="sm" className="mt-4 w-full">
                        {connected ? "Gerenciar" : "Conectar"}
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
