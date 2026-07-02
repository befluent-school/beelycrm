import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { SettingsView } from "@/components/app/settings-view";

export const metadata: Metadata = { title: "Configurações" };

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function SettingsPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const defaultTab = ["geral", "integracoes", "canais", "equipe", "planos"].includes(tab ?? "")
    ? (tab as string)
    : "geral";

  return (
    <>
      <Topbar title="Configurações" />
      <div className="p-6">
        <SettingsView defaultTab={defaultTab} />
      </div>
    </>
  );
}
