import { connection } from "next/server";
import { distributionAnalytics } from "@/server/gateway";
import { apiError, apiSuccess } from "@/server/http";
import { datasetMode, isResponse } from "@/server/dataset";
import { log } from "@/server/log";

export const maxDuration = 60;

export async function GET(request: Request) {
  await connection();
  const mode = datasetMode(request);
  if (isResponse(mode)) return mode;

  try {
    return apiSuccess(await distributionAnalytics(mode.mode));
  } catch (error) {
    log("error", "distribution analytics failed", { error: error instanceof Error ? error.name : "unknown" });
    return apiError(503, "database_unavailable", "Distribution analytics could not be read.");
  }
}
