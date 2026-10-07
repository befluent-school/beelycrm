"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { loadAll, db, mergeById } from "@/lib/db";
import type { DbSnapshot } from "@/lib/db";
import { STAGES_COMERCIAL_BF, COMERCIAL_BF_PIPELINE_ID } from "@/lib/demo-data";

/**
 * Garante que o "Funil Comercial Be Fluent" (Playbook v3, 8 etapas) exista.
 * Aditivo: se ausente na lista vinda do banco, anexa e persiste. Nunca
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
 * Hidrata o store Zustand com dados do Postgres (via /api/data, ver
 * src/lib/db.ts) na inicialização, e mantém refrescando periodicamente —
 * sem isso, uma aba aberta (ou navegação só client-side dentro da SPA, sem
 * reload) ficava com o dashboard/CRM inteiro congelado nos dados do
 * primeiro carregamento daquela aba.
 *
 * Fluxo:
 * 1. Aguarda hidratação do localStorage (Zustand persist)
 * 2. Chama loadAll() — tenta carregar dados do banco
 * 3. Se banco tem dados → hidrata store (banco vira source of truth)
 * 4. Se banco vazio → envia snapshot do localStorage para /api/migrate
 *    (seed inicial — só funciona uma vez, com o banco vazio)
 * 5. Repete o passo 2/3 a cada REFRESH_MS e sempre que a aba volta a ficar
 *    visível (troca de aba, minimizar/restaurar, computador voltando do sleep).
 *
 * Não roda mais init-schema via exec_sql (padrão antigo do Supabase) — o
 * schema agora é só migrations versionadas do Drizzle, aplicadas no deploy
 * (deploy/update.sh), nunca em runtime.
 */
const REFRESH_MS = 2 * 60 * 1000; // 2 min

export function useDataSync() {
  const synced = useRef(false);

  useEffect(() => {
    /**
     * Refresco leve: só relê o banco e atualiza o store — sem lógica de
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
        console.error("[sync] Falha ao refrescar dados:", e);
      }
    };

    const refreshInterval = setInterval(refresh, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);

    if (synced.current) {
      return () => {
        clearInterval(refreshInterval);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }
    synced.current = true;

    const run = async () => {
      try {
        const snapshot = await loadAll();

        if (snapshot) {
          // Banco tem dados — hidrata o store. Merge por id (não overwrite):
          // se a página recarrega logo após uma importação em lote, os
          // upserts de contacts/deals ainda podem estar em voo — um
          // overwrite puro aqui reproduziria, já no PRIMEIRO load da aba,
          // o mesmo bug de "leads somem" que o refresh periódico já corrige
          // depois de rodando. localStorage (já persistido pelo Zustand
          // antes deste efeito rodar) é a fonte mais recente para o que
          // ainda não confirmou no banco.
          const cur = useStore.getState();
          useStore.setState({
            pipelines:         ensureComercialBfPipeline(snapshot.pipelines),
            deals:             mergeById(cur.deals, snapshot.deals),
            contacts:          mergeById(cur.contacts, snapshot.contacts),
            activities:        mergeById(cur.activities, snapshot.activities),
            companies:         mergeById(cur.companies, snapshot.companies),
            automations:       mergeById(cur.automations, snapshot.automations),
            scoringRules:      mergeById(cur.scoringRules, snapshot.scoringRules),
            connectedChannels: snapshot.connectedChannels,
            integrations:      snapshot.integrations,
            financialConfig:   snapshot.financialConfig,
            sdrs:              mergeById(cur.sdrs, snapshot.sdrs),
          });
          console.log("[sync] Store hidratado do banco");
          // Limpa flag antigo se existir (banco foi repopulado)
          localStorage.removeItem("beely-migrated-to-db");
        } else {
          // Banco vazio — migra dados do localStorage para o banco (seed inicial)
          const alreadyMigrated = localStorage.getItem("beely-migrated-to-db");
          if (alreadyMigrated) {
            // Remove flag para tentar novamente — banco pode ter sido limpo
            localStorage.removeItem("beely-migrated-to-db");
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
            localStorage.setItem("beely-migrated-to-db", new Date().toISOString());
            console.log("[sync] Migração concluída:", result.migrated ?? "skipped");

            // Após migrar, recarrega do banco para confirmar
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
        console.error("[sync] Falha ao sincronizar com o banco:", e);
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
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
