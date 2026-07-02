"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useStore, type Contact } from "@/lib/store";
import { initials, cn } from "@/lib/utils";
import { Phone, Mail, MessageCircle, Trash2, X } from "lucide-react";

export function ContactDrawer({ contactId, onClose }: { contactId: string | null; onClose: () => void }) {
  const contact = useStore((s) => s.contacts.find((c) => c.id === contactId)) ?? null;
  if (!contact) return <Sheet open={false} onOpenChange={(o) => !o && onClose()} />;
  return <ContactDrawerInner key={contact.id} contact={contact} onClose={onClose} />;
}

function ContactDrawerInner({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const { deals, activities, updateContact, deleteContact } = useStore();
  const [form, setForm] = useState({
    name: contact.name, email: contact.email, phone: contact.phone, company: contact.company,
    source: contact.source, owner: contact.owner, score: contact.score,
  });
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(contact.tags);

  const dealsForContact = deals.filter((d) => d.contact === contact.name);
  const activitiesForContact = activities.filter((a) => a.contact === contact.name);

  function addTag(t: string) {
    const v = t.trim();
    if (!v || tags.includes(v)) return;
    setTags((arr) => [...arr, v]);
    setTagInput("");
  }
  function removeTag(t: string) {
    setTags((arr) => arr.filter((x) => x !== t));
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="p-0">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">{initials(contact.name)}</span>
            <div className="min-w-0">
              <SheetTitle className="truncate">{contact.name}</SheetTitle>
              <p className="truncate text-xs text-muted-foreground">{contact.company || "—"}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            {contact.phone && <Quick icon={Phone} label="Ligar" href={`tel:${contact.phone}`} />}
            {contact.email && <Quick icon={Mail} label="E-mail" href={`mailto:${contact.email}`} />}
            {contact.phone && <Quick icon={MessageCircle} label="WhatsApp" href={`https://wa.me/${contact.phone.replace(/\D/g, "")}`} />}
          </div>
        </SheetHeader>

        <form
          className="flex-1 space-y-3 overflow-y-auto p-5"
          onSubmit={(e) => {
            e.preventDefault();
            updateContact(contact.id, { ...form, score: Number(form.score), tags });
            toast.success("Contato atualizado.");
            onClose();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Empresa</Label><Input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Origem</Label><Input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Responsável</Label><Input value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Score (0–100)</Label>
              <Input type="number" min="0" max="100" value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                  {t}
                  <button type="button" onClick={() => removeTag(t)}><X className="size-3" /></button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
                placeholder="+ tag (Enter)"
                className="h-7 rounded-full border border-dashed border-border bg-transparent px-2 text-xs outline-none focus-visible:border-primary/50"
              />
            </div>
          </div>

          {dealsForContact.length > 0 && (
            <div>
              <Label className="mb-2 block">Negócios vinculados</Label>
              <div className="space-y-1">
                {dealsForContact.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="truncate">{d.title}</span>
                    <Badge variant={d.status === "won" ? "success" : d.status === "lost" ? "destructive" : "warning"}>{d.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activitiesForContact.length > 0 && (
            <div>
              <Label className="mb-2 block">Histórico de atividades</Label>
              <ul className="space-y-1 text-sm">
                {activitiesForContact.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className={cn(a.done && "text-muted-foreground line-through")}>{a.title}</span>
                    <span className="text-xs text-muted-foreground">{a.due}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button type="submit" className="w-full">Salvar alterações</Button>
          <Button type="button" variant="ghost" className="w-full text-destructive" onClick={() => { if (confirm(`Excluir o contato "${contact.name}"?`)) { deleteContact(contact.id); onClose(); toast("Contato excluído."); } }}>
            <Trash2 className="size-4" /> Excluir contato
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Quick({ icon: Icon, label, href }: { icon: React.ComponentType<{ className?: string }>; label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-white/[0.03] py-2 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary">
      <Icon className="size-3.5" /> {label}
    </a>
  );
}
