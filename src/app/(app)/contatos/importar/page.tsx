import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/app/topbar";
import { ImportLeads } from "@/components/app/import-leads";

export const metadata: Metadata = { title: "Importar leads" };

export default function ImportPage() {
  return (
    <>
      <Topbar title="Importar leads" />
      <div className="space-y-4 p-6">
        <Link href="/contatos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar para contatos
        </Link>
        <ImportLeads />
      </div>
    </>
  );
}
