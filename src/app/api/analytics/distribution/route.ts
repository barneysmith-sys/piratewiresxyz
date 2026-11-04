import { connection } from "next/server";
import { confirmedDistributionCount } from "@/server/analytics/topics";
import { getSession } from "@/server/db/session";
import { apiError, apiSuccess } from "@/server/http";
import { datasetMode, isResponse } from "@/server/dataset";
import { log } from "@/server/log";

export const maxDuration = 60;

export async function GET(request: Request) {
  await connection();
  const mode = datasetMode(request);
  if (isResponse(mode)) return mode;

  try {
    const session = await getSession();
    const confirmedLinks = await confirmedDistributionCount(session);
    return apiSuccess({
      mode: mode.mode,
      illustrative: false,
      confirmedLinks,
      note: "Confirmed article/post links only. The illustrative channel chart is a labelled fixture and is not included here.",
    });
  } catch (error) {
    log("error", "distribution analytics failed", { error: error instanceof Error ? error.name : "unknown" });
    return apiError(503, "database_unavailable", "Distribution analytics could not be read.");
  }
}
