import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { SettingsView } from "@/components/app/settings-view";

export const metadata: Metadata = { title: "Planos" };

export default function PlansPage() {
  return (
    <>
      <Topbar title="Planos" />
      <div className="p-3 sm:p-6">
        <SettingsView defaultTab="planos" />
      </div>
    </>
  );
}

