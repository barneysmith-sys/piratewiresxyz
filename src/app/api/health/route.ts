import { connection } from "next/server";
import { checkDatabase } from "@/server/db/health";
import { usesBundledDemo } from "@/server/demo/runtime";
import { apiError, apiSuccess } from "@/server/http";
import { log } from "@/server/log";

export const maxDuration = 60;

export async function GET() {
  await connection();

  try {
    if (usesBundledDemo()) {
      return apiSuccess({
        service: "pw-intelligence",
        status: "ok",
        database: "unconfigured",
        store: "bundled-fixtures",
        phase: "integrated",
      });
    }

    const database = await checkDatabase();
    if (database.status === "unconfigured") {
      const { getSession } = await import("@/server/db/session");
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
