import { connection } from "next/server";
import { confirmedTopicCounts } from "@/server/analytics/topics";
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
    if (mode.mode === "demo") {
      return apiSuccess({
        mode: "demo",
        illustrative: true,
        metric: "topic.article_count",
        topics: [],
        note: "This metric counts observed articles only. Illustrative assignments are excluded, including in demo mode.",
      });
    }
    const topics = await confirmedTopicCounts(session);
    return apiSuccess({
      mode: "analytical",
      illustrative: false,
      metric: "topic.article_count",
      topics,
      note: "Confirmed topic assignments on observed articles. Proposed and rejected assignments are omitted.",
    });
  } catch (error) {
    log("error", "topic analytics failed", { error: error instanceof Error ? error.name : "unknown" });
    return apiError(503, "database_unavailable", "Topic analytics could not be read.");
  }
}
