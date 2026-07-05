"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { useSupabaseSync } from "@/lib/use-supabase-sync";

/**
 * Triggers Zustand persist rehydration exactly once after the component mounts.
 * Must be rendered inside the client tree, never on the server.
 * Using skipHydration:true in the store prevents the "state update before mount" error.
 * After localStorage rehydration, also syncs with Supabase.
 */
export function StoreHydrator() {
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    useStore.persist.rehydrate();
  }, []);

  // Supabase sync happens after localStorage hydration
  useSupabaseSync();

  return null;
}
