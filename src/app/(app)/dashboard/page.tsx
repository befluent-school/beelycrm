import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { DashboardView } from "@/components/app/dashboard-view";

export const metadata: Metadata = { title: "Business Intelligence" };

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Business Intelligence" />
      <DashboardView />
    </>
  );
}
