import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { KanbanBoard } from "@/components/app/kanban-board";

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return (
    <>
      <Topbar title="Pipeline" />
      <div className="space-y-4 p-3 sm:p-6">
        <p className="text-sm text-muted-foreground">
          Crie funis e etapas, adicione negócios e arraste entre as etapas. Clique num card para ver detalhes, ganhar ou perder.
        </p>
        <KanbanBoard />
      </div>
    </>
  );
}

