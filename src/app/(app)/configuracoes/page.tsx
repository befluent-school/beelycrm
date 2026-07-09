import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { SettingsView } from "@/components/app/settings-view";

export const metadata: Metadata = { title: "ConfiguraÃ§Ãµes" };

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function SettingsPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const defaultTab = ["geral", "integracoes", "canais", "equipe", "planos"].includes(tab ?? "")
    ? (tab as string)
    : "geral";

  return (
    <>
      <Topbar title="ConfiguraÃ§Ãµes" />
      <div className="p-3 sm:p-6">
        <SettingsView defaultTab={defaultTab} />
      </div>
    </>
  );
}

