/** Centralized env access + demo-mode detection. */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

/**
 * Demo mode is on when explicitly enabled OR when Supabase isn't configured.
 * In demo mode the UI runs on mock data so the whole product is navigable
 * without any external accounts.
 */
export const IS_DEMO =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  !env.supabaseUrl ||
  !env.supabaseAnonKey;
