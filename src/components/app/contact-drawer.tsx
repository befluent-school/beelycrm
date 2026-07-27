"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStore, type Contact } from "@/lib/store";
import { initials, cn } from "@/lib/utils";
import { Phone, Mail, MessageCircle, Trash2, X, MapPin, Briefcase, BarChart2, Megaphone } from "lucide-react";

export function ContactDrawer({ contactId, onClose }: { contactId: string | null; onClose: () => void }) {
  const contact = useStore((s) => s.contacts.find((c) => c.id === contactId)) ?? null;
  if (!contact) return <Sheet open={false} onOpenChange={(o) => !o && onClose()} />;
  return <ContactDrawerInner key={contact.id} contact={contact} onClose={onClose} />;
}

function ContactDrawerInner({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const { deals, activities, pipelines, updateContact, deleteContact, addDeal, updateDeal, moveDeal } = useStore();

  // Deal aberto vinculado a este contato (se houver) — usado para pré-selecionar funil/etapa reais
  const linkedOpenDeal = deals.find((d) => (d.contact === contact.name || d.contactId === contact.id) && d.status === "open");
  const [pipelineId, setPipelineId] = useState<string>(linkedOpenDeal?.pipelineId ?? pipelines[0]?.id ?? "");
  const [stageId, setStageId]       = useState<string>(linkedOpenDeal?.stageId ?? pipelines[0]?.stages[0]?.id ?? "");
  const selectedPipeline = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0];

  const [form, setForm] = useState<Omit<Contact, "id">>({
    name:               contact.name,
    email:              contact.email,
    phone:              contact.phone,
    company:            contact.company,
    fantasyName:        contact.fantasyName ?? "",
    source:             contact.source,
    campaign:           contact.campaign ?? "",
    funnel:             contact.funnel ?? "",
    stage:              contact.stage ?? "",
    status:             contact.status ?? "",
    team:               contact.team ?? "",
    owner:              contact.owner,
    score:              contact.score,
    tags:               contact.tags,
    firstNote:          contact.firstNote ?? "",
    cpfCnpj:            contact.cpfCnpj ?? "",
    // Endereco
    cep:                contact.cep ?? "",
    country:            contact.country ?? "",
    state:              contact.state ?? "",
    city:               contact.city ?? "",
    neighborhood:       contact.neighborhood ?? "",
    street:             contact.street ?? "",
    complement:         contact.complement ?? "",
    number:             contact.number ?? "",
    // Endereco empresa
    companyCep:          contact.companyCep ?? "",
    companyCountry:      contact.companyCountry ?? "",
    companyState:        contact.companyState ?? "",
    companyCity:         contact.companyCity ?? "",
    companyNeighborhood: contact.companyNeighborhood ?? "",
    companyStreet:       contact.companyStreet ?? "",
    companyComplement:   contact.companyComplement ?? "",
    companyNumber:       contact.companyNumber ?? "",
    // Produto
    product:            contact.product ?? "",
    productValue:       contact.productValue,
    productDesc:        contact.productDesc ?? "",
    // Meta Ads
    metaAdId:           contact.metaAdId ?? "",
    metaAdName:         contact.metaAdName ?? "",
    metaAdsetId:        contact.metaAdsetId ?? "",
    metaAdsetName:      contact.metaAdsetName ?? "",
    metaCampaignId:     contact.metaCampaignId ?? "",
    metaCampaignName:   contact.metaCampaignName ?? "",
    metaFormId:         contact.metaFormId ?? "",
    metaFormName:       contact.metaFormName ?? "",
    metaPageId:         contact.metaPageId ?? "",
    metaPageName:       contact.metaPageName ?? "",
    metaLeadgenId:      contact.metaLeadgenId ?? "",
    metaPlatform:       contact.metaPlatform ?? "",
    // UTM
    utmUrl:             contact.utmUrl ?? "",
    utmMedium:          contact.utmMedium ?? "",
    utmSource:          contact.utmSource ?? "",
    utmCampaign:        contact.utmCampaign ?? "",
    utmTerm:            contact.utmTerm ?? "",
    utmContent:         contact.utmContent ?? "",
    // Qualificacao
    urgency:            contact.urgency ?? "",
    investmentIntent:   contact.investmentIntent ?? "",
    jobTitle:           contact.jobTitle ?? "",
    monthlyBudget:      contact.monthlyBudget ?? "",
    contactPreference:  contact.contactPreference ?? "",
    mainChallenge:      contact.mainChallenge ?? "",
    sector:             contact.sector ?? "",
    classFrequency:     contact.classFrequency ?? "",
    professionalMoment: contact.professionalMoment ?? "",
    // Misc
    externalId:         contact.externalId ?? "",
    registeredAt:       contact.registeredAt ?? "",
    discarded:          contact.discarded ?? false,
    discardReason:      contact.discardReason ?? "",
    discardDesc:        contact.discardDesc ?? "",
  });
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags]         = useState<string[]>(contact.tags);

  const dealsForContact = deals.filter((d) => d.contact === contact.name || d.contactId === contact.id);
  const activitiesForContact = activities.filter((a) => a.contact === contact.name);

  const f = (k: keyof typeof form) => (val: string) => setForm((prev) => ({ ...prev, [k]: val }));

  function save() {
    const pipe  = pipelines.find((p) => p.id === pipelineId);
    const stage = pipe?.stages.find((s) => s.id === stageId);

    updateContact(contact.id, {
      ...form,
      score: Number(form.score),
      tags,
      funnel: pipe?.name ?? form.funnel,
      stage:  stage?.name ?? form.stage,
    });

    // Sincroniza com o Pipeline: cria o deal se não existir, ou move/atualiza se já existir
    if (pipe && stage) {
      if (linkedOpenDeal) {
        if (linkedOpenDeal.pipelineId !== pipe.id || linkedOpenDeal.stageId !== stage.id) {
          if (linkedOpenDeal.pipelineId !== pipe.id) {
            updateDeal(linkedOpenDeal.id, { pipelineId: pipe.id, stageId: stage.id });
          } else {
            moveDeal(linkedOpenDeal.id, stage.id);
          }
        }
      } else {
        addDeal({
          title: `${form.name} — ${pipe.name}`,
          value: form.productValue ?? 0,
          pipelineId: pipe.id,
          stageId: stage.id,
          contact: form.name,
          contactId: contact.id,
          owner: form.owner,
        });
      }
    }

    toast.success("Contato atualizado.");
    onClose();
  }

  function handleDelete() {
    if (confirm(`Excluir o contato "${contact.name}" e todos os negócios vinculados?`)) {
      deleteContact(contact.id);
      onClose();
      toast("Contato e negócios excluídos.");
    }
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-xl p-0">
        {/* Header */}
        <SheetHeader className="border-b border-border/70 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">
              {initials(contact.name)}
            </span>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate">{contact.name}</SheetTitle>
              <p className="truncate text-xs text-muted-foreground">
                {[contact.company, contact.city && `${contact.city}/${contact.state}`].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            {contact.status && (
              <Badge variant={contact.status.toLowerCase() === "quente" ? "success" : contact.status.toLowerCase() === "frio" ? "outline" : "warning"}>
                {contact.status}
              </Badge>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            {contact.phone && <Quick icon={Phone} label="Ligar" href={`tel:${contact.phone}`} />}
            {contact.email && <Quick icon={Mail} label="E-mail" href={`mailto:${contact.email}`} />}
            {contact.phone && <Quick icon={MessageCircle} label="WhatsApp" href={`https://wa.me/${contact.phone.replace(/\D/g, "")}`} />}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="principal">
            <TabsList className="w-full rounded-none border-b border-border/70 px-5">
              <TabsTrigger value="principal" className="flex-1 gap-1.5"><Phone className="size-3.5" /> Principal</TabsTrigger>
              <TabsTrigger value="local" className="flex-1 gap-1.5"><MapPin className="size-3.5" /> Local</TabsTrigger>
              <TabsTrigger value="qualif" className="flex-1 gap-1.5"><Briefcase className="size-3.5" /> Qualif.</TabsTrigger>
              <TabsTrigger value="marketing" className="flex-1 gap-1.5"><Megaphone className="size-3.5" /> Mktg</TabsTrigger>
              <TabsTrigger value="negocios" className="flex-1 gap-1.5"><BarChart2 className="size-3.5" /> Neg.</TabsTrigger>
            </TabsList>

            {/* ABA: Principal */}
            <TabsContent value="principal" className="space-y-3 p-5">
              <div className="grid grid-cols-2 gap-3">
                <F2 label="Nome" value={form.name} onChange={f("name")} />
                <F2 label="E-mail" value={form.email} onChange={f("email")} />
                <F2 label="Telefone / Celular" value={form.phone} onChange={f("phone")} />
                <F2 label="CPF / CNPJ" value={form.cpfCnpj ?? ""} onChange={f("cpfCnpj")} />
                <F2 label="Razão Social" value={form.company} onChange={f("company")} />
                <F2 label="Nome Fantasia" value={form.fantasyName ?? ""} onChange={f("fantasyName")} />
                <F2 label="Origem" value={form.source} onChange={f("source")} />
                <F2 label="Campanha" value={form.campaign ?? ""} onChange={f("campaign")} />
                <F2 label="Responsável" value={form.owner} onChange={f("owner")} />
                <F2 label="Equipe" value={form.team ?? ""} onChange={f("team")} />
                <div>
                  <Label className="mb-1 block text-xs text-muted-foreground">Funil</Label>
                  <select
                    value={pipelineId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      setPipelineId(pid);
                      const p = pipelines.find((x) => x.id === pid);
                      setStageId(p?.stages[0]?.id ?? "");
                    }}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none"
                  >
                    {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-muted-foreground">Etapa</Label>
                  <select
                    value={stageId}
                    onChange={(e) => setStageId(e.target.value)}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none"
                  >
                    {selectedPipeline?.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <Label className="mb-1.5 block text-xs">Status</Label>
                  <select
                    value={form.status ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none"
                  >
                    <option value="">Sem status</option>
                    <option value="Quente">Quente</option>
                    <option value="Morno">Morno</option>
                    <option value="Frio">Frio</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Label className="mb-1.5 block text-xs">Score (0-100)</Label>
                  <Input type="number" min="0" max="100" value={form.score} onChange={(e) => setForm((p) => ({ ...p, score: Number(e.target.value) }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {t}
                      <button type="button" onClick={() => setTags((a) => a.filter((x) => x !== t))}><X className="size-3" /></button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = tagInput.trim(); if (v && !tags.includes(v)) setTags((a) => [...a, v]); setTagInput(""); } }}
                    placeholder="+ tag (Enter)"
                    className="h-7 rounded-full border border-dashed border-border bg-transparent px-2 text-xs outline-none focus-visible:border-primary/50"
                  />
                </div>
              </div>

              {/* Produto */}
              {(form.product || form.productValue) && (
                <div className="rounded-lg border border-border bg-white/[0.02] p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Produto</p>
                  <div className="grid grid-cols-2 gap-2">
                    <F2 label="Nome" value={form.product ?? ""} onChange={f("product")} />
                    <div>
                      <Label className="mb-1 block text-xs">Valor (R$)</Label>
                      <Input type="number" value={form.productValue ?? ""} onChange={(e) => setForm((p) => ({ ...p, productValue: Number(e.target.value) || undefined }))} />
                    </div>
                    <div className="col-span-2"><F2 label="Descrição" value={form.productDesc ?? ""} onChange={f("productDesc")} /></div>
                  </div>
                </div>
              )}

              {form.firstNote && (
                <div className="rounded-lg border border-border bg-white/[0.02] p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Primeira Anotação</p>
                  <p className="text-sm">{form.firstNote}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={save} className="flex-1">Salvar</Button>
                <Button type="button" variant="ghost" className="text-destructive" onClick={handleDelete}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </TabsContent>

            {/* ABA: Local */}
            <TabsContent value="local" className="space-y-4 p-5">
              <Section title="Endereço Pessoal">
                <div className="grid grid-cols-2 gap-2">
                  <F2 label="CEP" value={form.cep ?? ""} onChange={f("cep")} />
                  <F2 label="País" value={form.country ?? ""} onChange={f("country")} />
                  <F2 label="Estado" value={form.state ?? ""} onChange={f("state")} />
                  <F2 label="Cidade" value={form.city ?? ""} onChange={f("city")} />
                  <F2 label="Bairro" value={form.neighborhood ?? ""} onChange={f("neighborhood")} />
                  <F2 label="Logradouro" value={form.street ?? ""} onChange={f("street")} />
                  <F2 label="Número" value={form.number ?? ""} onChange={f("number")} />
                  <F2 label="Complemento" value={form.complement ?? ""} onChange={f("complement")} />
                </div>
              </Section>
              <Section title="Endereço Empresa">
                <div className="grid grid-cols-2 gap-2">
                  <F2 label="CEP" value={form.companyCep ?? ""} onChange={f("companyCep")} />
                  <F2 label="Estado" value={form.companyState ?? ""} onChange={f("companyState")} />
                  <F2 label="Cidade" value={form.companyCity ?? ""} onChange={f("companyCity")} />
                  <F2 label="Bairro" value={form.companyNeighborhood ?? ""} onChange={f("companyNeighborhood")} />
                  <F2 label="Logradouro" value={form.companyStreet ?? ""} onChange={f("companyStreet")} />
                  <F2 label="Número" value={form.companyNumber ?? ""} onChange={f("companyNumber")} />
                  <div className="col-span-2"><F2 label="Complemento" value={form.companyComplement ?? ""} onChange={f("companyComplement")} /></div>
                </div>
              </Section>
              <Button onClick={save} className="w-full">Salvar</Button>
            </TabsContent>

            {/* ABA: Qualificacao */}
            <TabsContent value="qualif" className="space-y-3 p-5">
              <div className="grid grid-cols-1 gap-3">
                <F2 label="Cargo" value={form.jobTitle ?? ""} onChange={f("jobTitle")} />
                <F2 label="Principal Urgência" value={form.urgency ?? ""} onChange={f("urgency")} />
                <F2 label="Investimento Pretendido" value={form.investmentIntent ?? ""} onChange={f("investmentIntent")} />
                <F2 label="Opção de Investimento Mensal" value={form.monthlyBudget ?? ""} onChange={f("monthlyBudget")} />
                <F2 label="Preferência de Contato" value={form.contactPreference ?? ""} onChange={f("contactPreference")} />
                <F2 label="Maior Desafio com Inglês" value={form.mainChallenge ?? ""} onChange={f("mainChallenge")} />
                <F2 label="Setor Corporativo" value={form.sector ?? ""} onChange={f("sector")} />
                <F2 label="Frequência de Aulas" value={form.classFrequency ?? ""} onChange={f("classFrequency")} />
                <F2 label="Momento Profissional" value={form.professionalMoment ?? ""} onChange={f("professionalMoment")} />
              </div>
              <Button onClick={save} className="w-full">Salvar</Button>
            </TabsContent>

            {/* ABA: Marketing */}
            <TabsContent value="marketing" className="space-y-4 p-5">
              <Section title="Meta Ads">
                <div className="grid grid-cols-2 gap-2">
                  <F2 label="Ad Name" value={form.metaAdName ?? ""} onChange={f("metaAdName")} />
                  <F2 label="Adset Name" value={form.metaAdsetName ?? ""} onChange={f("metaAdsetName")} />
                  <F2 label="Campaign Name" value={form.metaCampaignName ?? ""} onChange={f("metaCampaignName")} />
                  <F2 label="Form Name" value={form.metaFormName ?? ""} onChange={f("metaFormName")} />
                  <F2 label="Page Name" value={form.metaPageName ?? ""} onChange={f("metaPageName")} />
                  <F2 label="Platform" value={form.metaPlatform ?? ""} onChange={f("metaPlatform")} />
                </div>
              </Section>
              <Section title="UTM">
                <div className="grid grid-cols-2 gap-2">
                  <F2 label="Source" value={form.utmSource ?? ""} onChange={f("utmSource")} />
                  <F2 label="Medium" value={form.utmMedium ?? ""} onChange={f("utmMedium")} />
                  <F2 label="Campaign" value={form.utmCampaign ?? ""} onChange={f("utmCampaign")} />
                  <F2 label="Term" value={form.utmTerm ?? ""} onChange={f("utmTerm")} />
                  <F2 label="Content" value={form.utmContent ?? ""} onChange={f("utmContent")} />
                  <div className="col-span-2"><F2 label="UTM URL" value={form.utmUrl ?? ""} onChange={f("utmUrl")} /></div>
                </div>
              </Section>
              <Button onClick={save} className="w-full">Salvar</Button>
            </TabsContent>

            {/* ABA: Negocios */}
            <TabsContent value="negocios" className="space-y-4 p-5">
              {dealsForContact.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum negócio vinculado.</p>
              ) : (
                <div className="space-y-2">
                  {dealsForContact.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{d.title}</p>
                        <p className="text-xs text-muted-foreground">{d.notes?.slice(0, 60)}</p>
                      </div>
                      <Badge variant={d.status === "won" ? "success" : d.status === "lost" ? "destructive" : "warning"}>
                        {d.status === "won" ? "Ganho" : d.status === "lost" ? "Perdido" : "Aberto"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              {activitiesForContact.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atividades</p>
                  <ul className="space-y-1">
                    {activitiesForContact.slice(0, 6).map((a) => (
                      <li key={a.id} className={cn("flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm", a.done && "opacity-60")}>
                        <span className={cn(a.done && "line-through")}>{a.title}</span>
                        <span className="text-xs text-muted-foreground">{a.due}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Helpers de UI ────────────────────────────────────────────── */
function F2({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Quick({ icon: Icon, label, href }: { icon: React.ComponentType<{ className?: string }>; label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-white/[0.03] py-2 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary">
      <Icon className="size-3.5" /> {label}
    </a>
  );
}
