"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { loadAll } from "@/lib/db";
import type { DbSnapshot } from "@/lib/db";

/**
 * Hidrata o store Zustand com dados do Supabase na inicialização.
 * Também mantém o Render free tier ativo via keep-alive a cada 10 min.
 *
 * Fluxo:
 * 1. Aguarda hidratação do localStorage (Zustand persist)
 * 2. Chama loadAll() — tenta carregar dados do Supabase
 * 3. Se banco tem dados → hidrata store (Supabase vira source of truth)
 * 4. Se banco vazio → envia snapshot do localStorage para /api/migrate
 */
export function useSupabaseSync() {
  const synced = useRef(false);

  useEffect(() => {
    // Keep-alive: pinga o servidor a cada 10 min para o Render não hibernar
    const keepAlive = setInterval(() => {
      fetch("/api/ping").catch(() => {/* silencioso */});
    }, 10 * 60 * 1000);

    if (synced.current) return () => clearInterval(keepAlive);
    synced.current = true;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return () => clearInterval(keepAlive);

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
          // Limpa flag antigo se existir (banco foi repopulado)
          localStorage.removeItem("beely-migrated-to-supabase");
        } else {
          // Banco vazio — migra dados do localStorage para o Supabase
          const alreadyMigrated = localStorage.getItem("beely-migrated-to-supabase");
          if (alreadyMigrated) {
            // Remove flag para tentar novamente — banco pode ter sido limpo
            localStorage.removeItem("beely-migrated-to-supabase");
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

            // Após migrar, recarrega do Supabase para confirmar
            const fresh = await loadAll();
            if (fresh) {
              useStore.setState({
                pipelines:         fresh.pipelines,
                deals:             fresh.deals,
                contacts:          fresh.contacts,
                activities:        fresh.activities,
                companies:         fresh.companies,
                automations:       fresh.automations,
                scoringRules:      fresh.scoringRules,
                connectedChannels: fresh.connectedChannels,
                integrations:      fresh.integrations,
                financialConfig:   fresh.financialConfig,
              });
              console.log("[sync] Store re-hidratado após migração");
            }
          } else {
            console.error("[sync] Erros na migração:", result.errors);
          }
        }
      } catch (e) {
        console.error("[sync] Falha ao sincronizar com Supabase:", e);
      }
    };

    if (useStore.persist.hasHydrated()) {
      run();
    } else {
      const unsub = useStore.persist.onFinishHydration(() => {
        unsub();
        run();
      });
    }

    return () => clearInterval(keepAlive);
  }, []);
}
