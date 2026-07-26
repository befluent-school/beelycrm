"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore, DEFAULT_OWNER } from "@/lib/store";

export type QuickAddTab = "deal" | "contact" | "task" | "company";

const TITLES: Record<QuickAddTab, string> = {
  deal: "Novo lead / negócio",
  contact: "Novo contato",
  task: "Nova atividade",
  company: "Nova empresa",
};

export function QuickAdd({
  defaultTab = "deal",
  trigger,
  defaultPipelineId,
  defaultStageId,
}: {
  defaultTab?: QuickAddTab;
  trigger?: React.ReactNode;
  defaultPipelineId?: string;
  defaultStageId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<QuickAddTab>(defaultTab);
  const { pipelines, addDeal, addContact, addActivity, addCompany } = useStore();
  const close = () => setOpen(false);

  // Reset tab when opening (in case user changed it last time)
  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (o) setTab(defaultTab);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="hidden sm:inline-flex">
            <Plus className="size-4" /> Novo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{TITLES[tab]}</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as QuickAddTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="deal" className="flex-1">Lead / Negócio</TabsTrigger>
            <TabsTrigger value="contact" className="flex-1">Contato</TabsTrigger>
            <TabsTrigger value="company" className="flex-1">Empresa</TabsTrigger>
            <TabsTrigger value="task" className="flex-1">Tarefa</TabsTrigger>
          </TabsList>

          <TabsContent value="deal">
            <DealForm
              pipelines={pipelines}
              defaultPipelineId={defaultPipelineId}
              defaultStageId={defaultStageId}
              onSubmit={(f) => {
                const pipelineId = String(f.get("pipeline"));
                const pipeline = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0];
                const stageId = String(f.get("stage")) || pipeline.stages[0]?.id || "";
                const contactName = String(f.get("contact") || "—");
                const email = String(f.get("email") || "");
                const phone = String(f.get("phone") || "");

                // Cria o contato junto (dedupe automático no store por nome/telefone/e-mail)
                if (contactName && contactName !== "—") {
                  addContact({
                    name: contactName, email, phone, company: "",
                    source: "Manual", score: 10, tags: [], owner: DEFAULT_OWNER,
                  });
                }

                addDeal({
                  title: String(f.get("title")) || `${contactName} — ${pipeline.name}`,
                  value: Number(f.get("value") || 0),
                  pipelineId: pipeline.id,
                  stageId,
                  contact: contactName,
                  owner: DEFAULT_OWNER,
                });
                toast.success("Lead criado no funil!");
                close();
              }}
            />
          </TabsContent>

          <TabsContent value="contact">
            <ContactForm
              pipelines={pipelines}
              onSubmit={(f, pipe, stage) => {
                const name = String(f.get("name"));
                addContact({
                  name,
                  email: String(f.get("email") || ""),
                  phone: String(f.get("phone") || ""),
                  company: String(f.get("company") || ""),
                  source: String(f.get("source") || "Manual"),
                  score: 0,
                  tags: [],
                  owner: DEFAULT_OWNER,
                  funnel: pipe?.name,
                  stage: stage?.name,
                });
                if (pipe && stage) {
                  addDeal({
                    title: `${name} — ${pipe.name}`,
                    value: 0,
                    pipelineId: pipe.id,
                    stageId: stage.id,
                    contact: name,
                    owner: DEFAULT_OWNER,
                  });
                }
                toast.success("Contato adicionado!");
                close();
              }}
            />
          </TabsContent>

          <TabsContent value="company">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                addCompany({
                  name: String(f.get("name")),
                  domain: String(f.get("domain") || ""),
                  phone: String(f.get("phone") || ""),
                  segment: String(f.get("segment") || ""),
                  owner: DEFAULT_OWNER,
                });
                toast.success("Empresa adicionada!");
                close();
              }}
            >
              <Field label="Razão social / Nome"><Input name="name" required placeholder="Empresa X Ltda." /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Domínio / Site"><Input name="domain" placeholder="empresa.com" /></Field>
                <Field label="Telefone"><Input name="phone" placeholder="+55 ..." /></Field>
              </div>
              <Field label="Segmento"><Input name="segment" placeholder="SaaS, Varejo, Saúde..." /></Field>
              <Button type="submit" className="w-full">Adicionar empresa</Button>
            </form>
          </TabsContent>

          <TabsContent value="task">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                addActivity({
                  type: f.get("type") as "task" | "call" | "meeting" | "email",
                  title: String(f.get("title")),
                  due: String(f.get("due") || "Hoje"),
                  contact: String(f.get("contact") || "—"),
                });
                toast.success("Atividade criada!");
                close();
              }}
            >
              <Field label="Título"><Input name="title" required placeholder="Ex: Ligar para o lead" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo">
                  <select name="type" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="task">Tarefa</option>
                    <option value="call">Ligação</option>
                    <option value="meeting">Reunião</option>
                    <option value="email">E-mail</option>
                  </select>
                </Field>
                <Field label="Prazo"><Input name="due" placeholder="Hoje, 14:00" /></Field>
              </div>
              <Field label="Contato"><Input name="contact" placeholder="Nome do contato" /></Field>
              <Button type="submit" className="w-full">Criar atividade</Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

type PipelineLite = { id: string; name: string; stages: { id: string; name: string; probability: number }[] };

function ContactForm({
  pipelines, onSubmit,
}: {
  pipelines: PipelineLite[];
  onSubmit: (f: FormData, pipe?: PipelineLite, stage?: PipelineLite["stages"][number]) => void;
}) {
  const [pipelineId, setPipelineId] = useState<string>("");
  const pipeline = pipelines.find((p) => p.id === pipelineId);
  const [stageId, setStageId] = useState<string>("");
  const stage = pipeline?.stages.find((s) => s.id === stageId);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget), pipeline, stage); }}
    >
      <Field label="Nome"><Input name="name" required placeholder="Nome completo" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="E-mail"><Input name="email" type="email" placeholder="email@empresa.com" /></Field>
        <Field label="Telefone"><Input name="phone" placeholder="+55 ..." /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Empresa"><Input name="company" placeholder="Empresa" /></Field>
        <Field label="Origem"><Input name="source" placeholder="WhatsApp, Site..." /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Funil (opcional)">
          <select
            value={pipelineId}
            onChange={(e) => { setPipelineId(e.target.value); setStageId(""); }}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Não vincular</option>
            {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Etapa">
          <select
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            disabled={!pipeline}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            <option value="">—</option>
            {pipeline?.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      </div>
      <Button type="submit" className="w-full">Adicionar contato</Button>
    </form>
  );
}

function DealForm({
  pipelines, defaultPipelineId, defaultStageId, onSubmit,
}: {
  pipelines: { id: string; name: string; stages: { id: string; name: string; probability: number }[] }[];
  defaultPipelineId?: string;
  defaultStageId?: string;
  onSubmit: (f: FormData) => void;
}) {
  const [pipelineId, setPipelineId] = useState(defaultPipelineId ?? pipelines[0]?.id ?? "");
  const pipeline = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0];
  const [stageId, setStageId] = useState(defaultStageId ?? pipeline?.stages[0]?.id ?? "");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }}
    >
      <Field label="Nome do lead"><Input name="contact" required placeholder="Nome do lead/contato" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="E-mail"><Input name="email" type="email" placeholder="email@exemplo.com" /></Field>
        <Field label="Telefone"><Input name="phone" placeholder="+55 ..." /></Field>
      </div>
      <Field label="Título do negócio (opcional)"><Input name="title" placeholder="Ex: Plano anual — Empresa X" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)"><Input name="value" type="number" min="0" step="0.01" placeholder="0,00" /></Field>
        <Field label="Funil">
          <select
            name="pipeline" value={pipelineId}
            onChange={(e) => {
              const pid = e.target.value;
              setPipelineId(pid);
              const p = pipelines.find((x) => x.id === pid);
              setStageId(p?.stages[0]?.id ?? "");
            }}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Etapa">
        <select
          name="stage" value={stageId} onChange={(e) => setStageId(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {pipeline?.stages.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.probability}%</option>)}
        </select>
      </Field>
      <Button type="submit" className="w-full">Criar lead</Button>
    </form>
  );
}
