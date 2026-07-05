import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!_client) {
    _client = createClient(url, key);
  }
  return _client;
}

// Backward-compat export used in db.ts — returns a proxy that no-ops when unconfigured
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    if (!client) {
      // Return a no-op chain when Supabase is not configured
      const noop: unknown = new Proxy(
        Object.assign(
          () => noop,
          { data: null, error: new Error("Supabase not configured"), count: null }
        ),
        { get: () => noop }
      );
      return noop;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any)[prop];
  },
});
