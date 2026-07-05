"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { loadAll } from "@/lib/db";
import type { DbSnapshot } from "@/lib/db";

/**
 * Hidrata o store Zustand com dados do Supabase na inicialização.
 *
 * Fluxo:
 * 1. Chama loadAll() — tenta carregar dados do Supabase
 * 2. Se banco tem dados → hidrata store (Supabase vira source of truth)
 * 3. Se banco vazio → envia snapshot do localStorage para /api/migrate
 *    e marca localStorage como migrado para não repetir
 */
export function useSupabaseSync() {
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return;

    // Aguarda hidratação do localStorage antes de sincronizar
    const run = async () => {
      try {
        const snapshot = await loadAll();

        if (snapshot) {
          // Banco tem dados — hidrata o store
          useStore.setState({
            pipelines:         snapshot.pipelines,
            deals:             snapshot.deals,
            contacts:          snapshot.contacts,
            activities:        snapshot.activities,
            companies:         snapshot.companies,
            automations:       snapshot.automations,
            scoringRules:      snapshot.scoringRules,
            connectedChannels: snapshot.connectedChannels,
            integrations:      snapshot.integrations,
            financialConfig:   snapshot.financialConfig,
          });
          console.log("[sync] Store hidratado do Supabase");
        } else {
          // Banco vazio — migra dados do localStorage para o Supabase
          const alreadyMigrated = localStorage.getItem("beely-migrated-to-supabase");
          if (alreadyMigrated) {
            console.log("[sync] Migração já realizada anteriormente");
            return;
          }

          const state = useStore.getState();
          const payload: DbSnapshot = {
            pipelines:         state.pipelines,
            deals:             state.deals,
            contacts:          state.contacts,
            activities:        state.activities,
            companies:         state.companies,
            automations:       state.automations,
            scoringRules:      state.scoringRules,
            connectedChannels: state.connectedChannels,
            integrations:      state.integrations,
            financialConfig:   state.financialConfig,
          };

          const res = await fetch("/api/migrate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const result = await res.json();

          if (result.ok) {
            localStorage.setItem("beely-migrated-to-supabase", new Date().toISOString());
            console.log("[sync] Migração concluída:", result.migrated ?? "skipped");
          } else {
            console.error("[sync] Erros na migração:", result.errors);
          }
        }
      } catch (e) {
        console.error("[sync] Falha ao sincronizar com Supabase:", e);
      }
    };

    // Aguarda a hidratação do persist antes de rodar
    if (useStore.persist.hasHydrated()) {
      run();
    } else {
      const unsub = useStore.persist.onFinishHydration(() => {
        unsub();
        run();
      });
    }
  }, []);
}
