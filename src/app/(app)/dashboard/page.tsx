import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { DashboardView } from "@/components/app/dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Dashboard" />
      <DashboardView />
    </>
  );
}
