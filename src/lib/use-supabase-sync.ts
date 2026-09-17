"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { loadAll, db, mergeById } from "@/lib/db";
import type { DbSnapshot } from "@/lib/db";
import { STAGES_COMERCIAL_BF, COMERCIAL_BF_PIPELINE_ID } from "@/lib/demo-data";

/**
 * Garante que o "Funil Comercial Be Fluent" (Playbook v3, 8 etapas) exista.
 * Aditivo: se ausente na lista vinda do Supabase, anexa e persiste. Nunca
 * remove ou altera funis existentes.
 */
function ensureComercialBfPipeline(pipelines: DbSnapshot["pipelines"]): DbSnapshot["pipelines"] {
  if (pipelines.some((p) => p.id === COMERCIAL_BF_PIPELINE_ID)) return pipelines;
  const bf = {
    id: COMERCIAL_BF_PIPELINE_ID,
    name: "Funil Comercial Be Fluent",
    stages: STAGES_COMERCIAL_BF.map((s) => ({ ...s })),
  };
  void db.upsertPipeline(bf);
  return [...pipelines, bf];
}

/**
 * Hidrata o store Zustand com dados do Supabase na inicialização, e mantém
 * refrescando periodicamente — sem isso, uma aba aberta (ou navegação só
 * client-side dentro da SPA, sem reload) ficava com o dashboard/CRM inteiro
 * congelado nos dados do primeiro carregamento daquela aba: nenhum negócio
 * novo, nenhuma virada de mês, nada, até um F5 manual. Também mantém o
 * Render free tier ativo via keep-alive a cada 10 min.
 *
 * Fluxo:
 * 1. Aguarda hidratação do localStorage (Zustand persist)
 * 2. Chama loadAll() — tenta carregar dados do Supabase
 * 3. Se banco tem dados → hidrata store (Supabase vira source of truth)
 * 4. Se banco vazio → envia snapshot do localStorage para /api/migrate
 * 5. Repete o passo 2/3 a cada REFRESH_MS e sempre que a aba volta a ficar
 *    visível (troca de aba, minimizar/restaurar, computador voltando do sleep).
 */
const REFRESH_MS = 2 * 60 * 1000; // 2 min

export function useSupabaseSync() {
  const synced = useRef(false);

  useEffect(() => {
    // Keep-alive: pinga o servidor a cada 10 min para o Render não hibernar
    const keepAlive = setInterval(() => {
      fetch("/api/ping").catch(() => {/* silencioso */});
    }, 10 * 60 * 1000);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return () => clearInterval(keepAlive);

    /**
     * Refresco leve: só relê o Supabase e atualiza o store — sem lógica de
     * migração. Faz merge por id em vez de sobrescrever as listas: uma
     * importação em lote (centenas de upserts em voo) pode não ter
     * terminado de persistir quando este refresh dispara, e um overwrite
     * puro apagaria da tela os registros que ainda não chegaram ao banco
     * (o bug de "leads somem depois de importar").
     */
    const refresh = async () => {
      try {
        const fresh = await loadAll();
        if (fresh) {
          const cur = useStore.getState();
          useStore.setState({
            pipelines:         ensureComercialBfPipeline(fresh.pipelines),
            deals:             mergeById(cur.deals, fresh.deals),
            contacts:          mergeById(cur.contacts, fresh.contacts),
            activities:        mergeById(cur.activities, fresh.activities),
            companies:         mergeById(cur.companies, fresh.companies),
            automations:       mergeById(cur.automations, fresh.automations),
            scoringRules:      mergeById(cur.scoringRules, fresh.scoringRules),
            connectedChannels: fresh.connectedChannels,
            integrations:      fresh.integrations,
            financialConfig:   fresh.financialConfig,
            sdrs:              mergeById(cur.sdrs, fresh.sdrs),
          });
        }
      } catch (e) {
        console.error("[sync] Falha ao refrescar dados do Supabase:", e);
      }
    };

    const refreshInterval = setInterval(refresh, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);

    if (synced.current) {
      return () => {
        clearInterval(keepAlive);
        clearInterval(refreshInterval);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }
    synced.current = true;

    const run = async () => {
      try {
        // Garante (aditivamente) o schema do Playbook Comercial Be Fluent v3 e do
        // Inbox multi-SDR. Idempotente; falha silenciosa não bloqueia a sincronização.
        fetch("/api/playbook/init-schema").catch(() => {/* silencioso */});
        fetch("/api/inbox/init-schema").catch(() => {/* silencioso */});

        const snapshot = await loadAll();

        if (snapshot) {
          // Banco tem dados — hidrata o store
          useStore.setState({
            pipelines:         ensureComercialBfPipeline(snapshot.pipelines),
            deals:             snapshot.deals,
            contacts:          snapshot.contacts,
            activities:        snapshot.activities,
            companies:         snapshot.companies,
            automations:       snapshot.automations,
            scoringRules:      snapshot.scoringRules,
            connectedChannels: snapshot.connectedChannels,
            integrations:      snapshot.integrations,
            financialConfig:   snapshot.financialConfig,
            sdrs:              snapshot.sdrs,
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
            sdrs:              state.sdrs,
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
                pipelines:         ensureComercialBfPipeline(fresh.pipelines),
                deals:             fresh.deals,
                contacts:          fresh.contacts,
                activities:        fresh.activities,
                companies:         fresh.companies,
                automations:       fresh.automations,
                scoringRules:      fresh.scoringRules,
                connectedChannels: fresh.connectedChannels,
                integrations:      fresh.integrations,
                financialConfig:   fresh.financialConfig,
                sdrs:              fresh.sdrs,
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

    return () => {
      clearInterval(keepAlive);
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
