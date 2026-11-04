import { getServerEnv, type ServerEnv } from "../env";
import { log } from "../log";
import { getSql } from "./client";

export type DatabaseHealth = "unconfigured" | "up" | "down";

export async function checkDatabase(
  env: Pick<ServerEnv, "DATABASE_URL"> = getServerEnv(),
): Promise<{ status: DatabaseHealth }> {
  if (!env.DATABASE_URL) {
    return { status: "unconfigured" };
  }

  try {
    const sql = getSql();
    await sql`select 1 as ok`;
    return { status: "up" };
  } catch (error) {
    log("error", "database health check failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return { status: "down" };
  }
}
