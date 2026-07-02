import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { ActivitiesView } from "@/components/app/activities-view";

export const metadata: Metadata = { title: "Atividades" };

export default function ActivitiesPage() {
  return (
    <>
      <Topbar title="Atividades" />
      <div className="p-6">
        <ActivitiesView />
      </div>
    </>
  );
}
