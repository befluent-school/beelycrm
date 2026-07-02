"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

/**
 * Triggers Zustand persist rehydration exactly once after the component mounts.
 * Must be rendered inside the client tree, never on the server.
 * Using skipHydration:true in the store prevents the "state update before mount" error.
 */
export function StoreHydrator() {
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    useStore.persist.rehydrate();
  }, []);

  return null;
}
