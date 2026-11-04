import { connection } from "next/server";
import { overviewAnalytics } from "@/server/gateway";
import { apiError, apiSuccess } from "@/server/http";
import { datasetMode, isResponse } from "@/server/dataset";
import { log } from "@/server/log";

export const maxDuration = 60;

export async function GET(request: Request) {
  await connection();
  const mode = datasetMode(request);
  if (isResponse(mode)) return mode;

  try {
    return apiSuccess(await overviewAnalytics(mode.mode));
  } catch (error) {
    log("error", "analytics overview failed", { error: error instanceof Error ? error.name : "unknown" });
    return apiError(503, "database_unavailable", "Analytics could not be read.");
  }
}
