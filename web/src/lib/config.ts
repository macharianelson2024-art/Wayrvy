/**
 * Reads Vite env vars and exposes them as a typed, frozen config object.
 * Import this instead of touching import.meta.env directly.
 */

function env(key: string, fallback = ""): string {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  return v ?? fallback;
}

export const config = Object.freeze({
  apiUrl: env("VITE_API_URL", "/api"),
  darajaEnv: (env("VITE_DARAJA_ENV", "sandbox") as "sandbox" | "production"),
  depositMode: (env("VITE_DEPOSIT_MODE", "manual") as "manual" | "mpesa"),
});