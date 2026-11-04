import { connection } from "next/server";
import { checkDatabase } from "@/server/db/health";
import { getSession } from "@/server/db/session";
import { apiError, apiSuccess } from "@/server/http";
import { log } from "@/server/log";

export async function GET() {
  // Health depends on the live environment. Do not prerender it.
  await connection();

  try {
    const database = await checkDatabase();
    if (database.status === "unconfigured") {
      await getSession();
      return apiSuccess({
        service: "pw-intelligence",
        status: "ok",
        database: "sandbox",
        store: "local-pglite",
        phase: "integrated",
      });
    }
    const degraded = database.status === "down";
    return apiSuccess(
      {
        service: "pw-intelligence",
        status: degraded ? "degraded" : "ok",
        database: database.status,
        store: "postgres",
        phase: "integrated",
      },
      degraded ? 503 : 200,
    );
  } catch (error) {
    log("error", "health check failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return apiError(503, "database_unavailable", "The database health check failed.");
  }
}
