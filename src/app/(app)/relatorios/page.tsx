import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { ReportsView } from "@/components/app/reports-view";

export const metadata: Metadata = { title: "Relatórios" };

export default function ReportsPage() {
  return (
    <>
      <Topbar title="Relatórios" />
      <div className="p-3 sm:p-6">
        <ReportsView />
      </div>
    </>
  );
}

