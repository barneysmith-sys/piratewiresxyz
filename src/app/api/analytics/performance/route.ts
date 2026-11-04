import { connection } from "next/server";
import { analyticalRules } from "@/domain/metrics";
import { listArticles } from "@/server/articles/query";
import { describeReach } from "@/server/analytics/reach";
import { getSession } from "@/server/db/session";
import { apiError, apiSuccess } from "@/server/http";
import { datasetMode, isResponse } from "@/server/dataset";
import { log } from "@/server/log";

export async function GET(request: Request) {
  await connection();
  const mode = datasetMode(request);
  if (isResponse(mode)) return mode;

  try {
    if (mode.mode === "demo") {
      return apiSuccess({
        mode: "demo",
        illustrative: true,
        baseline: null,
        note: "Performance baselines are not computed from illustrative records.",
      });
    }
    const session = await getSession();
    const list = await listArticles(session, { mode: "analytical", limit: 100 });
    const reach = describeReach(list.observed.map((record) => record.views));
    return apiSuccess({
      mode: "analytical",
      illustrative: false,
      sampleMinimum: analyticalRules.minimumBaselineSample,
      measured: reach.measured,
      missing: reach.missing,
      medianLifetimeViews: reach.withheld === "not_age_aligned" ? reach.median : null,
      baseline: null,
      reason: reach.withheld === "none" ? "no_measurements" : reach.withheld,
      note: "No age-aligned window is stored, so article.relative_to_baseline stays unimplemented.",
    });
  } catch (error) {
    log("error", "performance analytics failed", { error: error instanceof Error ? error.name : "unknown" });
    return apiError(503, "database_unavailable", "Performance analytics could not be read.");
  }
}
