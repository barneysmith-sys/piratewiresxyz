import { z } from "zod";
import { analyticalRules } from "@/domain/metrics";
import { researchReportSchema, type ResearchReport as StoredReport } from "@/domain/schemas";
import type { Article } from "@/lib/data/types";
import type { DatasetMode } from "@/lib/data/mode";
import { fmt } from "@/lib/format";
import { buildReport, channelTable, detectTopic, resolveScope, scoreArticles } from "@/lib/research/analyze";
import type { ResearchReport, StageId } from "@/lib/research/types";
import { listArticles, type ArticleList } from "@/server/articles/query";
import {
  analyticalAudienceCount,
  authorPublicationCounts,
  confirmedDistributionCount,
  confirmedTopicCounts,
} from "@/server/analytics/topics";
import { describeReach } from "@/server/analytics/reach";
import type { SqlSession } from "@/server/db/migrate";

const STAGE_ROWS: { id: StageId; stage: string; order: number }[] = [
  { id: "discovery", stage: "content_discovery", order: 1 },
  { id: "distribution", stage: "distribution_research", order: 2 },
  { id: "performance", stage: "performance_analysis", order: 3 },
  { id: "audience", stage: "audience_analysis", order: 4 },
  { id: "synthesis", stage: "strategic_synthesis", order: 5 },
];

export type ResearchEvent =
  | { type: "stage"; stage: StageId; status: "running" | "complete" | "skipped"; summary?: string }
  | { type: "step"; stage: StageId; id: string; label: string; detail?: string; status: "running" | "done" }
  | { type: "report"; report: ResearchReport }
  | { type: "error"; message: string }
  | { type: "done" };

export type ResearchRunInput = {
  query: string;
  articleIds?: string[];
  mode: DatasetMode;
  yieldMs?: number;
};

const uuidSchema = z.uuid();

function asUuid(value: string | undefined): string | undefined {
  const parsed = uuidSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function pause(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function scopedRequest(articles: Article[], query: string, articleIds?: string[]) {
  if (!articleIds?.length) return { query, articleIds: undefined };
  const publicIds = articleIds.flatMap((id) => {
    const match = articles.find((article) => article.id === id || article.recordId === id);
    return match ? [match.id] : [];
  });
  return { query, articleIds: publicIds };
}

function emptyReport(query: string, mode: DatasetMode, reason: string): ResearchReport {
  return {
    query,
    provenance: mode === "demo" ? "simulated" : "live",
    generatedAt: new Date().toISOString(),
    scopeLabel: mode === "demo" ? "Illustrative corpus" : "Observed archive",
    focusTopic: detectTopic(query),
    articleIds: [],
    headline: "No articles in this scope",
    summary: reason,
    kpis: [
      { label: "Articles in scope", value: "0", note: mode === "demo" ? "illustrative" : "observed" },
      { label: "Measured views", value: "—", note: "not a zero" },
      { label: "Audience rows", value: "—", note: "not measured" },
      { label: "Recommendations", value: "0", note: "no evidence" },
    ],
    topics: [],
    weekly: [],
    channels: [],
    topArticles: [],
    findings: [],
    recommendations: [],
    limitations: [reason, "An empty scope is not reported as zero performance."],
  };
}

function analyticalReport(query: string, list: ArticleList, topicArticles: number, audienceRows: number): ResearchReport {
  const reach = describeReach(list.observed.map((record) => record.views));
  const limitations = [
    "Analytical mode reads observed rows only. Illustrative records are excluded.",
    "Engaged time, read-through and subscription attribution are not stored as measurements, so they are omitted.",
    reach.measured === 0
      ? "No view measurements are stored. Missing views are not shown as zero."
      : reach.withheld === "insufficient_sample"
        ? `Views are stored for ${reach.measured} article${reach.measured === 1 ? "" : "s"}, below the baseline sample of ${analyticalRules.minimumBaselineSample}. No baseline is reported.`
        : "The median below is a descriptive statistic of stored lifetime views. It is not an age-aligned baseline.",
    audienceRows === 0
      ? "No first-party audience rows exist, so audience analysis was skipped."
      : `${audienceRows} first-party audience rows were available. Social engagement was not converted into audience.`,
  ];
  const findings = list.observed.length
    ? [
        {
          id: "F1",
          stage: "discovery" as const,
          title: `${list.observed.length} observed article${list.observed.length === 1 ? "" : "s"} on file`,
          body: `${topicArticles} of them have a confirmed topic. ${reach.measured} have a stored view count.`,
          confidence: "High" as const,
          evidence: list.observed.slice(0, 5).map((record) => ({
            articleId: record.id,
            metric: "views",
            value: record.views == null ? "unmeasured" : fmt.int(record.views),
          })),
        },
      ]
    : [];

  return {
    query,
    provenance: "live",
    generatedAt: new Date().toISOString(),
    scopeLabel: "Observed archive",
    focusTopic: detectTopic(query),
    articleIds: list.observed.map((record) => record.id),
    headline: list.observed.length ? "Observed archive, without a baseline" : "No observed records",
    summary: list.observed.length
      ? `${list.observed.length} observed articles were read. ${limitations[2]}`
      : "The analytical archive is empty. Illustrative demo records were not substituted.",
    kpis: [
      { label: "Observed articles", value: fmt.int(list.observed.length), note: "illustrative excluded" },
      { label: "Confirmed topic rows", value: fmt.int(topicArticles) },
      { label: "Views measured", value: fmt.int(reach.measured), note: reach.missing ? `${reach.missing} missing` : undefined },
      {
        label: "Median lifetime views",
        value: reach.withheld === "not_age_aligned" && reach.median != null ? fmt.compact(reach.median) : "—",
        note: reach.withheld === "not_age_aligned" ? "not a baseline" : "withheld",
      },
    ],
    topics: [],
    weekly: [],
    channels: [],
    topArticles: [],
    findings,
    recommendations: [],
    limitations,
  };
}

function toStored(report: ResearchReport, requestId: string, executionMode: "analytical" | "simulated", ids: Map<string, string>): StoredReport {
  const evidenceFor = (articleId: string, metric: string, value: string) => ({
    description: `${articleId}: ${metric} ${value}`,
    articleId: asUuid(ids.get(articleId) ?? articleId),
    metric,
    value,
  });
  const keyFindings = report.findings
    .filter((finding) => finding.evidence.length > 0)
    .map((finding) => ({
      statement: `${finding.title}. ${finding.body}`,
      claimType: "calculated_metric" as const,
      evidence: finding.evidence.map((item) => evidenceFor(item.articleId, item.metric, item.value)),
    }));
  const recommendations = report.recommendations.flatMap((item) => {
    const evidence = report.findings
      .filter((finding) => item.basis.includes(finding.id))
      .flatMap((finding) => finding.evidence)
      .slice(0, 6)
      .map((entry) => evidenceFor(entry.articleId, entry.metric, entry.value));
    if (evidence.length === 0) return [];
    return [
      {
        observation: item.title,
        evidence,
        whyItMightMatter: item.body,
        experiment: item.body,
        measurementPlan:
          "Compare the named metric on the next published articles in this scope. Do not use illustrative records as the live baseline.",
        claimType: "recommendation" as const,
      },
    ];
  });
  const articleReferences = [...new Set(report.articleIds.map((id) => ids.get(id) ?? id))].flatMap((id) => {
    const parsed = asUuid(id);
    return parsed ? [parsed] : [];
  });

  return researchReportSchema.parse({
    requestId,
    executionMode,
    researchQuestion: report.query,
    researchedOn: new Date().toISOString().slice(0, 10),
    methodology:
      executionMode === "simulated"
        ? "Deterministic comparison of the labelled illustrative corpus: means, channel click-through, and a composite score. Every figure is computed from stored illustrative rows and is not Pirate Wires performance."
        : "Counts of observed articles and confirmed topics, plus a description of stored view totals. Baselines are withheld below the sample minimum and when the window is not age-aligned. Illustrative rows are excluded.",
    datasetsExamined:
      executionMode === "simulated"
        ? ["illustrative articles", "illustrative metric snapshots", "illustrative audience observations"]
        : ["observed articles", "confirmed topics", "analytical metric snapshots", "analytical audience observations"],
    keyFindings,
    supportingObservations: keyFindings.flatMap((finding) => finding.evidence).slice(0, 24),
    articleReferences,
    visualizationSpecs: [{ kind: "workspace_report", report }],
    limitations: report.limitations,
    opportunities: [],
    recommendations,
  });
}

export async function executeResearch(
  session: SqlSession,
  input: ResearchRunInput,
  emit: (event: ResearchEvent) => void = () => undefined,
): Promise<{ requestId: string; report: ResearchReport }> {
  const mode = input.mode;
  const list = await listArticles(session, { mode, limit: 100 });
  const executionMode = mode === "demo" ? "simulated" : "analytical";
  const intent = input.articleIds?.length ? "article_search" : detectTopic(input.query) ? "topic_comparison" : "general_research";
  const request = await session.query<{ id: string }>(
    `
      insert into public.research_requests (query, intent, required_datasets, status, execution_mode, started_at)
      values ($1, $2, $3::text[], 'running', $4, now())
      returning id::text as id
    `,
    [input.query, intent, ["articles", "topics", "metric_snapshots"], executionMode],
  );
  const requestId = request[0]?.id;
  if (!requestId) throw new Error("Research request was not stored.");

  for (const stage of STAGE_ROWS) {
    await session.query(
      `
        insert into public.research_tasks (request_id, stage, stage_order, status, inputs)
        values ($1::uuid, $2, $3, 'queued', $4::jsonb)
      `,
      [requestId, stage.stage, stage.order, JSON.stringify({ mode, articleIds: input.articleIds ?? [] })],
    );
  }

  const fail = async (message: string) => {
    await session.query(
      `update public.research_requests set status = 'failed', error_message = $2, completed_at = now() where id = $1::uuid`,
      [requestId, message],
    );
  };

  try {
    const ids = new Map<string, string>();
    for (const article of list.articles) if (article.recordId) ids.set(article.id, article.recordId);
    for (const record of list.observed) ids.set(record.id, record.recordId);

    const requestForScope = scopedRequest(list.articles, input.query, input.articleIds);
    const scope = resolveScope(requestForScope, list.articles);
    const topicCounts = mode === "analytical" ? await confirmedTopicCounts(session) : [];
    const audienceRows = await analyticalAudienceCount(session);
    const confirmedLinks = mode === "analytical" ? await confirmedDistributionCount(session) : 0;
    const authors =
      mode === "demo" ? await authorPublicationCounts(session, "illustrative") : await authorPublicationCounts(session, "observed");

    const report =
      mode === "demo"
        ? scope.focus.length === 0
          ? emptyReport(input.query, mode, "No illustrative articles matched this query. The analytical archive was not used as a substitute.")
          : buildReport(requestForScope, list.articles, "simulated")
        : list.observed.length === 0 && scope.focus.length === 0
          ? emptyReport(input.query, mode, list.emptyReason ?? "No observed articles are stored.")
          : analyticalReport(input.query, list, topicCounts.reduce((sum, topic) => sum + topic.articles, 0), audienceRows);

    const channels = mode === "demo" ? channelTable(scope.focus, scope.rest) : [];
    const scored = mode === "demo" && scope.focus.length ? scoreArticles(scope.focus) : [];
    const dates = scope.focus.map((article) => article.publishedAt).sort();

    const finish = async (
      stage: (typeof STAGE_ROWS)[number],
      status: "completed" | "skipped",
      summary: string,
      outputs: Record<string, unknown>,
    ) => {
      await session.query(
        `
          update public.research_tasks
          set status = $3, outputs = $4::jsonb, finished_at = now(),
              source_references = $5::jsonb
          where request_id = $1::uuid and stage = $2
        `,
        [
          requestId,
          stage.stage,
          status,
          JSON.stringify(outputs),
          JSON.stringify(list.articles.flatMap((article) => (article.recordId ? [article.recordId] : [])).slice(0, 12)),
        ],
      );
      emit({
        type: "stage",
        stage: stage.id,
        status: status === "skipped" ? "skipped" : "complete",
        summary,
      });
    };

    const step = (stage: StageId, id: string, label: string, detail?: string) => {
      emit({ type: "step", stage, id, label, detail, status: "done" });
    };

    for (const stage of STAGE_ROWS) {
      await session.query(
        `update public.research_tasks set status = 'running', started_at = now() where request_id = $1::uuid and stage = $2`,
        [requestId, stage.stage],
      );
      emit({ type: "stage", stage: stage.id, status: "running" });

      if (stage.id === "discovery") {
        const first = dates[0];
        const last = dates[dates.length - 1];
        step("discovery", "scope", mode === "demo" ? "Resolve the illustrative scope" : "Read observed articles", scope.label);
        step(
          "discovery",
          "dates",
          "Publication window",
          first && last ? `${first} → ${last}` : "no dated articles",
        );
        step("discovery", "authors", "Primary authors", `${authors.length} authors`);
        await finish(stage, "completed", scope.label, { articles: mode === "demo" ? scope.focus.length : list.observed.length });
      } else if (stage.id === "distribution") {
        if (mode === "demo") {
          const top = channels[0];
          step("distribution", "channels", "Sum stored channel impressions", top ? `${top.channel} leads` : "no channels");
          step("distribution", "ctr", "Click-through from stored clicks and impressions", `${channels.length} channels`);
          step("distribution", "links", "Confirmed platform links", "none — the fixture is not a confirmed social graph");
          await finish(stage, "completed", top ? `${top.channel} leads on stored impressions` : "No channel rows", {
            channels: channels.length,
          });
        } else {
          step("distribution", "links", "Count confirmed article/post links", fmt.int(confirmedLinks));
          step("distribution", "inferred", "Keep inferred links out of this count", "inferred links are a separate series");
          await finish(stage, "completed", `${fmt.int(confirmedLinks)} confirmed links`, { confirmedLinks });
        }
      } else if (stage.id === "performance") {
        if (mode === "demo" && scope.focus.length) {
          const kpi = report.kpis[1];
          step("performance", "views", "Mean views against the rest of the corpus", kpi?.delta ?? kpi?.value);
          step("performance", "score", "Score articles inside the scope", `${scored.length} scored`);
          step("performance", "sample", "Record the sample size", `${scope.focus.length} in scope`);
          await finish(stage, "completed", kpi ? `Avg views ${kpi.value}` : "Computed", { inScope: scope.focus.length });
        } else {
          const reach = describeReach(list.observed.map((record) => record.views));
          step("performance", "views", "Collect stored view totals", `${reach.measured} measured`);
          step("performance", "baseline", "Apply the baseline rule", reach.withheld === "none" ? "nothing measured" : reach.withheld);
          await finish(stage, "completed", reach.withheld === "not_age_aligned" ? "Median withheld as a baseline" : "No baseline reported", {
            withheld: reach.withheld,
            measured: reach.measured,
          });
        }
      } else if (stage.id === "audience") {
        if (audienceRows === 0) {
          step("audience", "source", "Look for first-party audience rows", "none");
          step(
            "audience",
            "proxy",
            mode === "demo" ? "Illustrative engagement proxies stay labelled" : "Do not invent conversions",
            mode === "demo" ? "shown only inside the simulated report" : "stage skipped",
          );
          await finish(
            stage,
            "skipped",
            mode === "demo" ? "Skipped · no first-party audience. Proxies stay in the simulated report." : "Skipped · no first-party audience rows",
            { audienceRows: 0, reason: "no_first_party_audience" },
          );
        } else {
          step("audience", "rows", "Count first-party audience rows", fmt.int(audienceRows));
          await finish(stage, "completed", `${fmt.int(audienceRows)} audience rows`, { audienceRows });
        }
      } else {
        step("synthesis", "findings", "Write findings that cite stored rows", `${report.findings.length} findings`);
        step("synthesis", "actions", "Keep recommendations tied to evidence", `${report.recommendations.length} recommendations`);
        step("synthesis", "limits", "Record limitations", `${report.limitations.length} caveats`);
        await finish(stage, "completed", `${report.findings.length} findings · ${report.recommendations.length} actions`, {
          findings: report.findings.length,
        });
      }
      await pause(input.yieldMs ?? 0);
    }

    const stored = toStored(report, requestId, executionMode, ids);
    await session.query(
      `
        insert into public.research_reports (
          request_id, execution_mode, research_question, researched_on, methodology,
          datasets_examined, key_findings, supporting_observations, article_references,
          visualization_specs, limitations, opportunities, recommendations
        ) values (
          $1::uuid, $2, $3, $4::date, $5,
          $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb,
          $10::jsonb, $11::jsonb, '[]'::jsonb, $12::jsonb
        )
      `,
      [
        requestId,
        executionMode,
        stored.researchQuestion,
        stored.researchedOn,
        stored.methodology,
        JSON.stringify(stored.datasetsExamined),
        JSON.stringify(stored.keyFindings),
        JSON.stringify(stored.supportingObservations),
        JSON.stringify(stored.articleReferences),
        JSON.stringify(stored.visualizationSpecs),
        JSON.stringify(stored.limitations),
        JSON.stringify(stored.recommendations),
      ],
    );
    await session.query(
      `update public.research_requests set status = 'completed', completed_at = now() where id = $1::uuid`,
      [requestId],
    );
    emit({ type: "report", report });
    emit({ type: "done" });
    return { requestId, report };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Research failed.";
    await fail(message);
    throw error;
  }
}
