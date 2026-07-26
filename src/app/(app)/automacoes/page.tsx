import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { AutomationsView } from "@/components/app/automations-view";

export const metadata: Metadata = { title: "Automações" };

export default function AutomationsPage() {
  return (
    <>
      <Topbar title="Automações" />
      <div className="p-3 sm:p-6">
        <AutomationsView />
      </div>
    </>
  );
}

