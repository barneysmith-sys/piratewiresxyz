import { connection } from "next/server";
import { listArticles } from "@/server/articles/query";
import { analyticalAudienceCount, confirmedDistributionCount, confirmedTopicCounts } from "@/server/analytics/topics";
import { describeReach } from "@/server/analytics/reach";
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
      const list = await listArticles(session, { mode: "demo", limit: 100 });
      return apiSuccess({
        mode: "demo",
        illustrative: true,
        articleCount: list.articles.length,
        note: "Counts of the labelled illustrative corpus. Not Pirate Wires performance.",
        unavailable: ["age-aligned baseline", "engagement rate", "first-party audience"],
      });
    }

    const [topics, links, audience, list] = await Promise.all([
      confirmedTopicCounts(session),
      confirmedDistributionCount(session),
      analyticalAudienceCount(session),
      listArticles(session, { mode: "analytical", limit: 100 }),
    ]);
    const reach = describeReach(list.observed.map((record) => record.views));
    return apiSuccess({
      mode: "analytical",
      illustrative: false,
      observedArticles: list.observed.length,
      confirmedTopicAssignments: topics.reduce((sum, topic) => sum + topic.articles, 0),
      confirmedDistributionLinks: links,
      audienceRows: audience,
      views: {
        measured: reach.measured,
        missing: reach.missing,
        median: reach.withheld === "not_age_aligned" ? reach.median : null,
        withheld: reach.withheld,
      },
      unavailable: ["engaged time", "read-through", "subscription attribution", "age-aligned baseline"],
    });
  } catch (error) {
    log("error", "analytics overview failed", { error: error instanceof Error ? error.name : "unknown" });
    return apiError(503, "database_unavailable", "Analytics could not be read.");
  }
}
