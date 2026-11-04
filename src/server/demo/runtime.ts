/**
 * Vercel has no durable disk and this demo has no hosted database.
 * Without DATABASE_URL, the serverless runtime serves the bundled corpus.
 * Local development keeps the PGlite sandbox unless PW_STORE=memory.
 */
export function usesBundledDemo(env: Record<string, string | undefined> = process.env): boolean {
  if (env.DATABASE_URL) return false;
  if (env.PW_STORE === "pglite") return false;
  if (env.PW_STORE === "memory") return true;
  return env.VERCEL === "1";
}
