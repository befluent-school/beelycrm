import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { CallsView } from "@/components/app/calls-view";

export const metadata: Metadata = { title: "Ligações IA" };

export default function LigacoesPage() {
  return (
    <>
      <Topbar title="Ligações com IA" />
      <CallsView />
    </>
  );
}
