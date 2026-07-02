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
  deal: "Novo negócio",
  contact: "Novo contato",
  task: "Nova atividade",
  company: "Nova empresa",
};

export function QuickAdd({
  defaultTab = "deal",
  trigger,
}: {
  defaultTab?: QuickAddTab;
  trigger?: React.ReactNode;
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
            <TabsTrigger value="deal" className="flex-1">Negócio</TabsTrigger>
            <TabsTrigger value="contact" className="flex-1">Contato</TabsTrigger>
            <TabsTrigger value="company" className="flex-1">Empresa</TabsTrigger>
            <TabsTrigger value="task" className="flex-1">Tarefa</TabsTrigger>
          </TabsList>

          <TabsContent value="deal">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const pipelineId = String(f.get("pipeline"));
                const pipeline = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0];
                addDeal({
                  title: String(f.get("title")),
                  value: Number(f.get("value") || 0),
                  pipelineId: pipeline.id,
                  stageId: pipeline.stages[0]?.id ?? "",
                  contact: String(f.get("contact") || "—"),
                  owner: DEFAULT_OWNER,
                });
                toast.success("Negócio criado no funil!");
                close();
              }}
            >
              <Field label="Título do negócio"><Input name="title" required placeholder="Ex: Plano anual — Empresa X" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valor (R$)"><Input name="value" type="number" min="0" step="0.01" placeholder="0,00" /></Field>
                <Field label="Funil">
                  <select name="pipeline" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Contato"><Input name="contact" placeholder="Nome do contato" /></Field>
              <Button type="submit" className="w-full">Criar negócio</Button>
            </form>
          </TabsContent>

          <TabsContent value="contact">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                addContact({
                  name: String(f.get("name")),
                  email: String(f.get("email") || ""),
                  phone: String(f.get("phone") || ""),
                  company: String(f.get("company") || ""),
                  source: String(f.get("source") || "Manual"),
                  score: 0,
                  tags: [],
                  owner: DEFAULT_OWNER,
                });
                toast.success("Contato adicionado!");
                close();
              }}
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
              <Button type="submit" className="w-full">Adicionar contato</Button>
            </form>
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
