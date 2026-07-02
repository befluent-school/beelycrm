"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { useStore, useHydrated, DEFAULT_OWNER, type Deal } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DealDrawer } from "./deal-drawer";
import { formatCurrency, cn } from "@/lib/utils";
import { GripVertical, Plus, MoreVertical, Trophy, XCircle, Trash2, Check } from "lucide-react";

export function KanbanBoard() {
  const hydrated = useHydrated();
  const { pipelines, deals, addPipeline, deletePipeline, addStage, renameStage, deleteStage, moveDeal } = useStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [newFunnel, setNewFunnel] = useState(false);
  const [addDealStage, setAddDealStage] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const pipeline = useMemo(
    () => pipelines.find((p) => p.id === selectedId) ?? pipelines[0],
    [pipelines, selectedId]
  );

  const byStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    if (pipeline) for (const s of pipeline.stages) map[s.id] = [];
    for (const d of deals) if (d.pipelineId === pipeline?.id) (map[d.stageId] ??= []).push(d);
    return map;
  }, [deals, pipeline]);

  if (!hydrated || !pipeline) {
    return <div className="h-64 animate-pulse rounded-xl border border-border bg-card/40" />;
  }

  const activeDeal = deals.find((d) => d.id === activeDragId) ?? null;

  return (
    <div className="space-y-4">
      {/* Pipeline tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {pipelines.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedId(p.id)}
            className={cn(
              "group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              p.id === pipeline.id ? "border-primary/60 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-white/[0.05]"
            )}
          >
            {p.name}
            {pipelines.length > 1 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir o funil "${p.name}"?`)) { deletePipeline(p.id); setSelectedId(null); } }}
                className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </span>
            )}
          </button>
        ))}

        {newFunnel ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = (e.currentTarget.elements.namedItem("n") as HTMLInputElement).value.trim();
              if (v) { const id = addPipeline(v); setSelectedId(id); toast.success("Funil criado!"); }
              setNewFunnel(false);
            }}
          >
            <Input name="n" autoFocus placeholder="Nome do funil" className="h-8 w-44" onBlur={() => setNewFunnel(false)} />
          </form>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setNewFunnel(true)}><Plus className="size-4" /> Novo funil</Button>
        )}
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setActiveDragId(String(e.active.id))}
        onDragEnd={(e: DragEndEvent) => {
          setActiveDragId(null);
          if (e.over) moveDeal(String(e.active.id), String(e.over.id));
        }}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pipeline.stages.map((stage) => {
            const stageDeals = byStage[stage.id] ?? [];
            const total = stageDeals.reduce((s, d) => s + (d.status === "lost" ? 0 : d.value), 0);
            return (
              <Column
                key={stage.id}
                id={stage.id}
                name={stage.name}
                count={stageDeals.length}
                total={total}
                probability={stage.probability}
                onAddDeal={() => setAddDealStage(stage.id)}
                onRename={(name) => renameStage(pipeline.id, stage.id, name)}
                onDelete={() => { if (confirm(`Excluir a etapa "${stage.name}"? Os negócios nela serão removidos.`)) deleteStage(pipeline.id, stage.id); }}
              >
                {stageDeals.map((d) => (
                  <DealCard key={d.id} deal={d} onClick={() => setOpenDealId(d.id)} />
                ))}
              </Column>
            );
          })}

          {/* Add stage */}
          <AddStageColumn onAdd={(name) => addStage(pipeline.id, name, 50)} />
        </div>

        <DragOverlay>{activeDeal ? <DealCardView deal={activeDeal} dragging /> : null}</DragOverlay>
      </DndContext>

      {/* Add deal modal */}
      <AddDealDialog
        pipelineId={pipeline.id}
        stageId={addDealStage}
        onClose={() => setAddDealStage(null)}
      />

      {/* Deal detail */}
      <DealDrawer dealId={openDealId} onClose={() => setOpenDealId(null)} />
    </div>
  );
}

function Column({
  id, name, count, total, probability, children, onAddDeal, onRename, onDelete,
}: {
  id: string; name: string; count: number; total: number; probability: number;
  children: React.ReactNode; onAddDeal: () => void; onRename: (n: string) => void; onDelete: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [renaming, setRenaming] = useState(false);

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        {renaming ? (
          <form onSubmit={(e) => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem("r") as HTMLInputElement).value.trim(); if (v) onRename(v); setRenaming(false); }}>
            <Input name="r" autoFocus defaultValue={name} className="h-7 w-40 text-sm" onBlur={() => setRenaming(false)} />
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold">{name}</span>
            <Badge variant="secondary" className="text-[10px]">{count}</Badge>
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRenaming(true)}>Renomear etapa</DropdownMenuItem>
            <DropdownMenuItem onClick={onAddDeal}>Adicionar negócio</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>Excluir etapa</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-medium text-primary">{formatCurrency(total)}</span>
        <span className="text-[10px] text-muted-foreground">{probability}%</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-32 flex-1 flex-col gap-2 rounded-xl border border-dashed border-border bg-white/[0.02] p-2 transition-colors",
          isOver && "border-primary bg-accent/40"
        )}
      >
        {children}
        <button onClick={onAddDeal} className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/70 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
          <Plus className="size-3.5" /> Adicionar negócio
        </button>
      </div>
    </div>
  );
}

function AddStageColumn({ onAdd }: { onAdd: (name: string) => void }) {
  const [active, setActive] = useState(false);
  return (
    <div className="w-64 shrink-0 pt-8">
      {active ? (
        <form onSubmit={(e) => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem("s") as HTMLInputElement).value.trim(); if (v) onAdd(v); setActive(false); }}>
          <Input name="s" autoFocus placeholder="Nome da etapa" className="h-9" onBlur={() => setActive(false)} />
        </form>
      ) : (
        <button onClick={() => setActive(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
          <Plus className="size-4" /> Nova etapa
        </button>
      )}
    </div>
  );
}

function DealCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: deal.id });
  return (
    <div ref={setNodeRef} className={cn(isDragging && "opacity-40")}>
      <DealCardView deal={deal} onClick={onClick} dragHandle={listeners} dragAttrs={attributes as unknown as Record<string, unknown>} />
    </div>
  );
}

function DealCardView({
  deal, dragging, onClick, dragHandle, dragAttrs,
}: {
  deal: Deal; dragging?: boolean; onClick?: () => void;
  dragHandle?: Record<string, unknown>; dragAttrs?: Record<string, unknown>;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "card-premium cursor-pointer rounded-lg p-3 transition-colors",
        dragging && "shadow-2xl",
        deal.status === "lost" && "opacity-60",
        deal.status === "won" && "border-success/40"
      )}
    >
      <div className="flex items-start gap-1.5">
        <span {...dragHandle} {...dragAttrs} className="mt-0.5 cursor-grab touch-none" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium">{deal.title}</p>
            {deal.status === "won" && <Trophy className="size-3 shrink-0 text-success" />}
            {deal.status === "lost" && <XCircle className="size-3 shrink-0 text-destructive" />}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{deal.contact}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-display text-sm font-bold text-primary">{formatCurrency(deal.value)}</span>
            {deal.tags?.[0] && <Badge variant="outline" className="text-[10px]">{deal.tags[0]}</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddDealDialog({ pipelineId, stageId, onClose }: { pipelineId: string; stageId: string | null; onClose: () => void }) {
  const addDeal = useStore((s) => s.addDeal);
  return (
    <Dialog open={Boolean(stageId)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo negócio</DialogTitle></DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            addDeal({
              title: String(f.get("title")),
              value: Number(f.get("value") || 0),
              pipelineId,
              stageId: stageId!,
              contact: String(f.get("contact") || "—"),
              owner: DEFAULT_OWNER,
            });
            toast.success("Negócio adicionado à etapa!");
            onClose();
          }}
        >
          <div className="space-y-1.5"><Label>Título</Label><Input name="title" required autoFocus placeholder="Ex: Plano anual — Empresa X" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Valor (R$)</Label><Input name="value" type="number" min="0" step="0.01" placeholder="0,00" /></div>
            <div className="space-y-1.5"><Label>Contato</Label><Input name="contact" placeholder="Nome" /></div>
          </div>
          <Button type="submit" className="w-full"><Check className="size-4" /> Adicionar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
