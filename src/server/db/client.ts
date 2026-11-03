import postgres from "postgres";
import { getServerEnv } from "../env";

export type Sql = ReturnType<typeof postgres>;

let client: Sql | undefined;

/**
 * Lazy server-only pool. prepare: false is required for Supabase's
 * transaction pooler. The client is never created at import time, so
 * `next build` does not need a database.
 */
export function getSql(): Sql {
  const { DATABASE_URL: databaseUrl } = getServerEnv();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!client) {
    client = postgres(databaseUrl, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 5,
    });
  }
  return client;
}
