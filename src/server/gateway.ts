import { analyticalRules } from "@/domain/metrics";
import type { DatasetMode } from "@/lib/data/mode";
import { describeReach } from "@/server/analytics/reach";
import type { ArticleList } from "@/server/articles/query";
import { bundledAuthorCounts, listBundledArticles } from "@/server/demo/catalog";
import { usesBundledDemo } from "@/server/demo/runtime";
import type { ResearchEvent, ResearchRunInput } from "@/server/research/execute";

async function sessionArticles(input: {
  mode: DatasetMode;
  q?: string;
  topic?: string;
  id?: string;
  limit?: number;
}): Promise<ArticleList> {
  const { getSession } = await import("@/server/db/session");
  const { listArticles } = await import("@/server/articles/query");
  return listArticles(await getSession(), input);
}

export async function readArticles(input: {
  mode: DatasetMode;
  q?: string;
  topic?: string;
  id?: string;
  limit?: number;
}): Promise<ArticleList> {
  if (usesBundledDemo()) return listBundledArticles(input);
  return sessionArticles(input);
}

export async function runResearch(input: ResearchRunInput, emit: (event: ResearchEvent) => void = () => undefined) {
  if (usesBundledDemo()) {
    const { executeBundledResearch } = await import("@/server/demo/run");
    return executeBundledResearch(input, emit);
  }
  const { getSession } = await import("@/server/db/session");
  const { executeResearch } = await import("@/server/research/execute");
  return executeResearch(await getSession(), input, emit);
}

export async function overviewAnalytics(mode: DatasetMode) {
  if (mode === "demo") {
    const list = await readArticles({ mode: "demo", limit: 100 });
    return {
      mode: "demo" as const,
      illustrative: true,
      articleCount: list.articles.length,
      note: "Article count is the verified publication sample. Performance figures are illustrative, not Pirate Wires analytics.",
      unavailable: ["age-aligned baseline", "engagement rate", "first-party audience"],
    };
  }
  if (usesBundledDemo()) {
    return {
      mode: "analytical" as const,
      illustrative: false,
      observedArticles: 0,
      confirmedTopicAssignments: 0,
      confirmedDistributionLinks: 0,
      audienceRows: 0,
      views: { measured: 0, missing: 0, median: null, withheld: "none" as const },
      unavailable: ["engaged time", "read-through", "subscription attribution", "age-aligned baseline"],
    };
  }
  const { getSession } = await import("@/server/db/session");
  const { analyticalAudienceCount, confirmedDistributionCount, confirmedTopicCounts } = await import("@/server/analytics/topics");
  const session = await getSession();
  const [topics, links, audience, list] = await Promise.all([
    confirmedTopicCounts(session),
    confirmedDistributionCount(session),
    analyticalAudienceCount(session),
    sessionArticles({ mode: "analytical", limit: 100 }),
  ]);
  const reach = describeReach(list.observed.map((record) => record.views));
  return {
    mode: "analytical" as const,
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
  };
}

export async function topicAnalytics(mode: DatasetMode) {
  if (mode === "demo") {
    return {
      mode,
      illustrative: true,
      metric: "topic.article_count",
      topics: [],
      note: "This metric counts observed articles only. Illustrative assignments are excluded, including in demo mode.",
    };
  }
  if (usesBundledDemo()) {
    return {
      mode,
      illustrative: false,
      metric: "topic.article_count",
      topics: [],
      note: "Confirmed topic assignments on observed articles. Proposed and rejected assignments are omitted.",
    };
  }
  const { getSession } = await import("@/server/db/session");
  const { confirmedTopicCounts } = await import("@/server/analytics/topics");
  const topics = await confirmedTopicCounts(await getSession());
  return {
    mode,
    illustrative: false,
    metric: "topic.article_count",
    topics,
    note: "Confirmed topic assignments on observed articles. Proposed and rejected assignments are omitted.",
  };
}

export async function authorAnalytics(mode: DatasetMode) {
  if (usesBundledDemo()) {
    const articles = mode === "demo" ? listBundledArticles({ mode: "demo", limit: 100 }).articles : [];
    return {
      mode,
      illustrative: mode === "demo",
      authors: bundledAuthorCounts(articles),
      note:
        mode === "demo"
          ? "Primary-author counts inside the illustrative corpus. Not a ranking of Pirate Wires writers."
          : "Observed articles per primary author. Frequency is not an engagement ranking.",
    };
  }
  const { getSession } = await import("@/server/db/session");
  const { authorPublicationCounts } = await import("@/server/analytics/topics");
  const authors = await authorPublicationCounts(await getSession(), mode === "demo" ? "illustrative" : "observed");
  return {
    mode,
    illustrative: mode === "demo",
    authors,
    note:
      mode === "demo"
        ? "Primary-author counts inside the illustrative corpus. Not a ranking of Pirate Wires writers."
        : "Observed articles per primary author. Frequency is not an engagement ranking.",
  };
}

export async function distributionAnalytics(mode: DatasetMode) {
  if (usesBundledDemo()) {
    return {
      mode,
      illustrative: false,
      confirmedLinks: 0,
      note: "Confirmed article/post links only. The illustrative channel chart is a labelled fixture and is not included here.",
    };
  }
  const { getSession } = await import("@/server/db/session");
  const { confirmedDistributionCount } = await import("@/server/analytics/topics");
  const confirmedLinks = await confirmedDistributionCount(await getSession());
  return {
    mode,
    illustrative: false,
    confirmedLinks,
    note: "Confirmed article/post links only. The illustrative channel chart is a labelled fixture and is not included here.",
  };
}

export async function performanceAnalytics(mode: DatasetMode) {
  if (mode === "demo") {
    return {
      mode: "demo" as const,
      illustrative: true,
      baseline: null,
      note: "Performance baselines are not computed from illustrative records.",
    };
  }
  if (usesBundledDemo()) {
    return {
      mode: "analytical" as const,
      illustrative: false,
      sampleMinimum: analyticalRules.minimumBaselineSample,
      measured: 0,
      missing: 0,
      medianLifetimeViews: null,
      baseline: null,
      reason: "no_measurements",
      note: "No age-aligned window is stored, so article.relative_to_baseline stays unimplemented.",
    };
  }
  const list = await sessionArticles({ mode: "analytical", limit: 100 });
  const reach = describeReach(list.observed.map((record) => record.views));
  return {
    mode: "analytical" as const,
    illustrative: false,
    sampleMinimum: analyticalRules.minimumBaselineSample,
    measured: reach.measured,
    missing: reach.missing,
    medianLifetimeViews: reach.withheld === "not_age_aligned" ? reach.median : null,
    baseline: null,
    reason: reach.withheld === "none" ? "no_measurements" : reach.withheld,
    note: "No age-aligned window is stored, so article.relative_to_baseline stays unimplemented.",
  };
}
