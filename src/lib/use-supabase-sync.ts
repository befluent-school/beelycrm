"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { loadAll, seedSupabase } from "@/lib/db";
import type { DbSnapshot } from "@/lib/db";

/**
 * Hidrata o store Zustand com dados do Supabase na inicialização.
 * - Se o banco tiver dados, substitui o seed local pelos dados reais.
 * - Se o banco estiver vazio, faz seed com os dados atuais do store.
 *
 * Deve ser montado UMA VEZ no layout raiz, após a hidratação do localStorage.
 */
export function useSupabaseSync() {
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      // Supabase não configurado — silenciosamente ignora
      return;
    }

    (async () => {
      try {
        const snapshot = await loadAll();

        if (snapshot) {
          // Banco tem dados — hidrata o store com dados reais do Supabase
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
          // Banco vazio — faz seed com dados locais atuais (localStorage ou demo)
          const state = useStore.getState();
          const localSnapshot: DbSnapshot = {
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
          await seedSupabase(localSnapshot);
          console.log("[sync] Seed inicial enviado ao Supabase");
        }
      } catch (e) {
        console.error("[sync] Falha ao sincronizar com Supabase:", e);
      }
    })();
  }, []);
}
