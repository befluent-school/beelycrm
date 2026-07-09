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
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { useStore, useHydrated, DEFAULT_OWNER, type Deal, dealTemperature } from "@/lib/store";
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
import { GripVertical, Plus, MoreVertical, Trophy, XCircle, Trash2, Check, Flame, Thermometer, Snowflake } from "lucide-react";

/* ── Temperatura do lead ─────────────────────────────────────── */
const TEMP_CFG = {
  hot:  { icon: Flame,        label: "Quente", class: "text-orange-400",  border: "border-orange-400/40"  },
  warm: { icon: Thermometer,  label: "Morno",  class: "text-yellow-400",  border: "border-yellow-400/30"  },
  cold: { icon: Snowflake,    label: "Frio",   class: "text-blue-400",    border: "border-blue-400/30"    },
} as const;

/* ── Prefix para distinguir drag de deal vs drag de coluna ───── */
const COL_PREFIX = "col:";

export function KanbanBoard() {
  const hydrated = useHydrated();
  const { pipelines, deals, addPipeline, deletePipeline, addStage, renameStage, deleteStage, reorderStages, moveDeal } = useStore();

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
    for (const d of deals) if (d.pipelineId === pipeline?.id && d.status === "open") (map[d.stageId] ??= []).push(d);
    return map;
  }, [deals, pipeline]);

  if (!hydrated || !pipeline) {
    return <div className="h-64 animate-pulse rounded-xl border border-border bg-card/40" />;
  }

  const isDraggingCol  = activeDragId?.startsWith(COL_PREFIX) ?? false;
  const activeDeal     = !isDraggingCol ? (deals.find((d) => d.id === activeDragId) ?? null) : null;
  const stageIds       = pipeline.stages.map((s) => s.id);
  const colDragIds     = pipeline.stages.map((s) => COL_PREFIX + s.id);

  function handleDragStart(e: DragStartEvent) {
    setActiveDragId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    setActiveDragId(null);

    if (activeId.startsWith(COL_PREFIX)) {
      // Reordenacao de colunas
      if (!e.over) return;
      const fromId = activeId.replace(COL_PREFIX, "");
      const toId   = String(e.over.id).replace(COL_PREFIX, "");
      if (fromId === toId) return;
      const oldOrder = pipeline.stages.map((s) => s.id);
      const from = oldOrder.indexOf(fromId);
      const to   = oldOrder.indexOf(toId);
      if (from < 0 || to < 0) return;
      reorderStages(pipeline.id, arrayMove(oldOrder, from, to));
      toast.success("Ordem das etapas atualizada.");
    } else {
      // Mover deal entre colunas
      if (!e.over) return;
      const overId = String(e.over.id);

      // Se soltou em cima da coluna (droppable) — usa direto
      if (stageIds.includes(overId)) {
        moveDeal(activeId, overId);
        return;
      }

      // Se soltou em cima de outro deal — descobre qual coluna ele pertence
      const targetDeal = deals.find((d) => d.id === overId);
      if (targetDeal && stageIds.includes(targetDeal.stageId)) {
        moveDeal(activeId, targetDeal.stageId);
      }
    }
  }

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
          <form onSubmit={(e) => {
            e.preventDefault();
            const v = (e.currentTarget.elements.namedItem("n") as HTMLInputElement).value.trim();
            if (v) { const id = addPipeline(v); setSelectedId(id); toast.success("Funil criado!"); }
            setNewFunnel(false);
          }}>
            <Input name="n" autoFocus placeholder="Nome do funil" className="h-8 w-44" onBlur={() => setNewFunnel(false)} />
          </form>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setNewFunnel(true)}><Plus className="size-4" /> Novo funil</Button>
        )}

        {/* Legenda de temperatura */}
        <div className="flex w-full items-center gap-3 text-[10px] text-muted-foreground sm:ml-auto sm:w-auto">
          {(["hot", "warm", "cold"] as const).map((t) => {
            const cfg = TEMP_CFG[t];
            return (
              <span key={t} className={cn("flex items-center gap-1", cfg.class)}>
                <cfg.icon className="size-3" /> {cfg.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Dica mobile */}
      <p className="text-center text-[11px] text-muted-foreground/50 sm:hidden">← Deslize para ver todas as etapas →</p>

      {/* Board com duplo DndContext (colunas + deals) */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={colDragIds} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-3 overflow-x-auto pb-4 sm:gap-4" style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
            {pipeline.stages.map((stage) => {
              const stageDeals = byStage[stage.id] ?? [];
              const total = stageDeals.reduce((s, d) => s + d.value, 0);
              return (
                <SortableColumn
                  key={stage.id}
                  id={stage.id}
                  name={stage.name}
                  count={stageDeals.length}
                  total={total}
                  probability={stage.probability}
                  onAddDeal={() => setAddDealStage(stage.id)}
                  onRename={(name) => renameStage(pipeline.id, stage.id, name)}
                  onDelete={() => { if (confirm(`Excluir a etapa "${stage.name}"? Os negocios nela serao removidos.`)) deleteStage(pipeline.id, stage.id); }}
                >
                  {stageDeals.map((d) => (
                    <DealCard key={d.id} deal={d} onClick={() => setOpenDealId(d.id)} />
                  ))}
                </SortableColumn>
              );
            })}

            <AddStageColumn onAdd={(name) => addStage(pipeline.id, name, 50)} />
          </div>
        </SortableContext>

        <DragOverlay>
          {activeDeal ? <DealCardView deal={activeDeal} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <AddDealDialog pipelineId={pipeline.id} stageId={addDealStage} onClose={() => setAddDealStage(null)} />
      <DealDrawer dealId={openDealId} onClose={() => setOpenDealId(null)} />
    </div>
  );
}

/* ── Coluna sortable (arrastar para reordenar) ────────────────── */
function SortableColumn({
  id, name, count, total, probability, children, onAddDeal, onRename, onDelete,
}: {
  id: string; name: string; count: number; total: number; probability: number;
  children: React.ReactNode; onAddDeal: () => void; onRename: (n: string) => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef: setSortRef, transform, transition, isDragging: isSortDragging } =
    useSortable({ id: COL_PREFIX + id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });
  const [renaming, setRenaming] = useState(false);

  return (
    <div
      ref={(node) => { setSortRef(node); setDropRef(node); }}
      style={{ ...style, scrollSnapAlign: "start" }}
      className={cn("flex w-[80vw] shrink-0 flex-col sm:w-72", isSortDragging && "opacity-50")}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        {/* Drag handle da coluna */}
        <button
          {...attributes}
          {...listeners}
          className="mr-1.5 cursor-grab touch-none rounded p-0.5 text-muted-foreground/40 hover:text-muted-foreground"
          title="Arrastar para reordenar etapa"
        >
          <GripVertical className="size-4" />
        </button>

        {renaming ? (
          <form onSubmit={(e) => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem("r") as HTMLInputElement).value.trim(); if (v) onRename(v); setRenaming(false); }}>
            <Input name="r" autoFocus defaultValue={name} className="h-7 w-36 text-sm" onBlur={() => setRenaming(false)} />
          </form>
        ) : (
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <span className="truncate font-display text-sm font-semibold">{name}</span>
            <Badge variant="secondary" className="shrink-0 text-[10px]">{count}</Badge>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRenaming(true)}>Renomear etapa</DropdownMenuItem>
            <DropdownMenuItem onClick={onAddDeal}>Adicionar negocio</DropdownMenuItem>
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
        className={cn(
          "flex flex-1 flex-col gap-2 rounded-xl border border-dashed border-border bg-white/[0.02] p-2 transition-colors",
          "max-h-[calc(100vh-280px)] overflow-y-auto",
          isOver && "border-primary bg-accent/40"
        )}
      >
        {children}
        <button onClick={onAddDeal} className="mt-1 flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/70 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
          <Plus className="size-3.5" /> Adicionar negocio
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

/* ── Card do deal ──────────────────────────────────────────────── */
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
  const temp    = dealTemperature(deal);
  const tempCfg = TEMP_CFG[temp];
  const TempIcon = tempCfg.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        "card-premium cursor-pointer rounded-lg p-3 transition-colors",
        dragging && "shadow-2xl",
        deal.status === "lost" && "opacity-60",
        deal.status === "won" && "border-success/40",
        // borda colorida pela temperatura
        temp === "hot"  && "border-l-2 border-l-orange-400/60",
        temp === "cold" && "border-l-2 border-l-blue-400/50",
      )}
    >
      <div className="flex items-start gap-1.5">
        <span {...dragHandle} {...dragAttrs} className="mt-0.5 cursor-grab touch-none" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium">{deal.title}</p>
            {deal.status === "won"  && <Trophy  className="size-3 shrink-0 text-success"     />}
            {deal.status === "lost" && <XCircle className="size-3 shrink-0 text-destructive" />}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{deal.contact}</p>
          <div className="mt-2 flex items-center justify-between gap-1">
            <span className="font-display text-sm font-bold text-primary">{formatCurrency(deal.value)}</span>
            <div className="flex items-center gap-1">
              <TempIcon className={cn("size-3 shrink-0", tempCfg.class)} />
              {deal.tags?.[0] && <Badge variant="outline" className="text-[10px]">{deal.tags[0]}</Badge>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Modal novo negocio ─────────────────────────────────────────── */
function AddDealDialog({ pipelineId, stageId, onClose }: { pipelineId: string; stageId: string | null; onClose: () => void }) {
  const addDeal = useStore((s) => s.addDeal);
  return (
    <Dialog open={Boolean(stageId)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo negocio</DialogTitle></DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            addDeal({
              title:      String(f.get("title")),
              value:      Number(f.get("value") || 0),
              pipelineId,
              stageId:    stageId!,
              contact:    String(f.get("contact") || "—"),
              owner:      DEFAULT_OWNER,
            });
            toast.success("Negocio adicionado a etapa!");
            onClose();
          }}
        >
          <div className="space-y-1.5"><Label>Titulo</Label><Input name="title" required autoFocus placeholder="Ex: Plano anual - Empresa X" /></div>
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
