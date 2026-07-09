import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { AutomationsView } from "@/components/app/automations-view";

export const metadata: Metadata = { title: "AutomaÃ§Ãµes" };

export default function AutomationsPage() {
  return (
    <>
      <Topbar title="AutomaÃ§Ãµes" />
      <div className="p-3 sm:p-6">
        <AutomationsView />
      </div>
    </>
  );
}

