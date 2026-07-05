"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useSupabaseSync } from "@/lib/use-supabase-sync";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Hidrata localStorage (Zustand persist)
  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);

  // Sincroniza com Supabase após hidratação local
  useSupabaseSync();

  return <>{children}</>;
}
