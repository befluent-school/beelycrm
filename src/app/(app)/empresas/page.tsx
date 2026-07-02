import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { EmpresasView } from "@/components/app/empresas-view";

export const metadata: Metadata = { title: "Empresas" };

export default function CompaniesPage() {
  return (
    <>
      <Topbar title="Empresas" />
      <div className="p-6">
        <EmpresasView />
      </div>
    </>
  );
}
