import type { AuthState } from "@/lib/auth-actions";

export function AuthMessage({ state }: { state: AuthState }) {
  if (!state?.error && !state?.notice) return null;
  const isError = Boolean(state.error);
  return (
    <div
      className={`rounded-md border px-3 py-2 text-sm ${
        isError
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-success/30 bg-success/10 text-success"
      }`}
    >
      {state.error ?? state.notice}
    </div>
  );
}
