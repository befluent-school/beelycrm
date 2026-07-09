import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { ReportsView } from "@/components/app/reports-view";

export const metadata: Metadata = { title: "RelatÃ³rios" };

export default function ReportsPage() {
  return (
    <>
      <Topbar title="RelatÃ³rios" />
      <div className="p-3 sm:p-6">
        <ReportsView />
      </div>
    </>
  );
}

