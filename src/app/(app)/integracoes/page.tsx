import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { IntegrationsView } from "@/components/app/integrations-view";

export const metadata: Metadata = { title: "Integrações" };

export default function IntegracoesPage() {
  return (
    <>
      <Topbar title="Integrações" />
      <div className="p-3 sm:p-6">
        <IntegrationsView />
      </div>
    </>
  );
}

