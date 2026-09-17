"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { ArrowRightLeft, Check } from "lucide-react";

/**
 * Reatribui um contato (e seus negócios abertos) a outro SDR.
 * Usado no Inbox, no Deal Drawer e no Contact Drawer.
 *
 * Interpretação de "transferência": a conversa de WhatsApp não muda de
 * número (impossível mover um chat entre números) — o que muda é quem no
 * Beely é responsável pelo lead a partir de agora. Nenhuma mensagem
 * automática é enviada ao lead nesta ação.
 */
export function TransferLeadDialog({
  contactId,
  contactName,
  open,
  onOpenChange,
  onTransferred,
}: {
  contactId: string | null;
  contactName?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onTransferred?: (sdrId: string) => void;
}) {
  const sdrs = useStore((s) => s.sdrs);
  const assignContactToSdr = useStore((s) => s.assignContactToSdr);
  const [selected, setSelected] = useState<string | null>(null);
  const activeSdrs = sdrs.filter((s) => s.active);

  function confirm() {
    if (!contactId || !selected) return;
    assignContactToSdr(contactId, selected);
    const sdr = sdrs.find((s) => s.id === selected);
    toast.success(`Lead transferido para ${sdr?.name ?? "SDR"}.`);
    onTransferred?.(selected);
    setSelected(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setSelected(null); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-4 text-primary" /> Transferir para outro SDR
          </DialogTitle>
          <DialogDescription>
            {contactName ? `${contactName} passa a ser responsabilidade do SDR escolhido.` : "Escolha o SDR responsável."}
          </DialogDescription>
        </DialogHeader>

        {activeSdrs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum SDR ativo cadastrado. Adicione em Configurações → SDRs &amp; WhatsApp.
          </p>
        ) : (
          <div className="space-y-1.5">
            {activeSdrs.map((sdr) => (
              <button
                key={sdr.id}
                type="button"
                onClick={() => setSelected(sdr.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  selected === sdr.id ? "border-primary/60 bg-primary/10" : "border-border hover:bg-white/[0.03]"
                )}
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: sdr.avatarColor || "#E59313" }}
                >
                  {sdr.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{sdr.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {sdr.phoneDisplay || (sdr.waProvider ? sdr.waProvider : "sem WhatsApp conectado")}
                  </span>
                </span>
                {selected === sdr.id && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        )}

        <Button className="w-full" disabled={!selected} onClick={confirm}>
          Confirmar transferência
        </Button>
      </DialogContent>
    </Dialog>
  );
}
