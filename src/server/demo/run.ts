import { buildReport, channelTable, detectTopic, resolveScope, scoreArticles } from "@/lib/research/analyze";
import type { ResearchReport, StageId } from "@/lib/research/types";
import type { ResearchEvent, ResearchRunInput } from "@/server/research/execute";
import { bundledAuthorCounts, listBundledArticles } from "./catalog";

function pause(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function emptyReport(query: string, reason: string): ResearchReport {
  return {
    query,
    provenance: "live",
    generatedAt: new Date().toISOString(),
    scopeLabel: "Observed archive",
    focusTopic: detectTopic(query),
    articleIds: [],
    headline: "No articles in this scope",
    summary: reason,
    kpis: [
      { label: "Articles in scope", value: "0", note: "observed" },
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

/**
 * Same five-stage narration as the database runner, computed from the bundled
 * corpus. Nothing is written to disk and no external service is called.
 */
export async function executeBundledResearch(
  input: ResearchRunInput,
  emit: (event: ResearchEvent) => void = () => undefined,
): Promise<{ requestId: string; report: ResearchReport }> {
  const list = listBundledArticles({ mode: input.mode, limit: 100 });
  const explicit = (input.articleIds?.length ?? 0) > 0;
  const matched = explicit ? input.articleIds!.filter((id) => list.articles.some((article) => article.id === id)) : undefined;
  const requestForScope = explicit
    ? { query: input.query, articleIds: matched?.length ? matched : ["__none__"] }
    : { query: input.query };
  const scope = resolveScope(requestForScope, list.articles);
  const demo = input.mode === "demo";
  const report =
    demo && scope.focus.length > 0
      ? buildReport(requestForScope, list.articles, "simulated")
      : emptyReport(
          input.query,
          demo
            ? "No illustrative articles matched this query."
            : (list.emptyReason ?? "No observed articles are stored."),
        );
  const channels = demo ? channelTable(scope.focus, scope.rest) : [];
  const scored = demo && scope.focus.length ? scoreArticles(scope.focus) : [];
  const authors = demo ? bundledAuthorCounts(scope.focus) : [];
  const dates = scope.focus.map((article) => article.publishedAt).sort();

  const step = (stage: StageId, id: string, label: string, detail?: string) => {
    emit({ type: "step", stage, id, label, detail, status: "done" });
  };

  const stages: { id: StageId; run: () => { status: "complete" | "skipped"; summary: string } }[] = [
    {
      id: "discovery",
      run: () => {
        step("discovery", "scope", demo ? "Resolve the illustrative scope" : "Read observed articles", scope.label);
        step(
          "discovery",
          "dates",
          "Publication window",
          dates[0] && dates[dates.length - 1] ? `${dates[0]} → ${dates[dates.length - 1]}` : "no dated articles",
        );
        step("discovery", "authors", "Primary authors", `${authors.length} authors`);
        return { status: "complete", summary: scope.label };
      },
    },
    {
      id: "distribution",
      run: () => {
        if (demo) {
          const top = channels[0];
          step("distribution", "channels", "Sum labelled channel impressions", top ? `${top.channel} leads` : "no channels");
          step("distribution", "ctr", "Click-through from the fixture's clicks and impressions", `${channels.length} channels`);
          step("distribution", "links", "Confirmed platform links", "none — the fixture is not a confirmed social graph");
          return { status: "complete", summary: top ? `${top.channel} leads on labelled impressions` : "No channel rows" };
        }
        step("distribution", "links", "Count confirmed article/post links", "0");
        step("distribution", "inferred", "Keep inferred links out of this count", "no observed posts are stored");
        return { status: "complete", summary: "0 confirmed links" };
      },
    },
    {
      id: "performance",
      run: () => {
        if (demo && scope.focus.length) {
          const kpi = report.kpis[1];
          step("performance", "views", "Mean views against the rest of the corpus", kpi?.delta ?? kpi?.value);
          step("performance", "score", "Score articles inside the scope", `${scored.length} scored`);
          step("performance", "sample", "Record the sample size", `${scope.focus.length} in scope`);
          return { status: "complete", summary: kpi ? `Avg views ${kpi.value}` : "Computed" };
        }
        step("performance", "views", "Collect stored view totals", "0 measured");
        step("performance", "baseline", "Apply the baseline rule", "no measurements");
        return { status: "complete", summary: "No baseline reported" };
      },
    },
    {
      id: "audience",
      run: () => {
        step("audience", "source", "Look for first-party audience rows", "none");
        step(
          "audience",
          "proxy",
          demo ? "Illustrative engagement proxies stay labelled" : "Do not invent conversions",
          demo ? "shown only inside the simulated report" : "stage skipped",
        );
        return {
          status: "skipped",
          summary: demo
            ? "Skipped · no first-party audience. Proxies stay in the simulated report."
            : "Skipped · no first-party audience rows",
        };
      },
    },
    {
      id: "synthesis",
      run: () => {
        step("synthesis", "findings", "Write findings that cite the records in scope", `${report.findings.length} findings`);
        step("synthesis", "actions", "Keep recommendations tied to evidence", `${report.recommendations.length} recommendations`);
        step("synthesis", "limits", "Record limitations", `${report.limitations.length} caveats`);
        return { status: "complete", summary: `${report.findings.length} findings · ${report.recommendations.length} actions` };
      },
    },
  ];

  for (const stage of stages) {
    emit({ type: "stage", stage: stage.id, status: "running" });
    await pause(input.yieldMs ?? 0);
    const finished = stage.run();
    emit({ type: "stage", stage: stage.id, status: finished.status, summary: finished.summary });
    await pause(Math.round((input.yieldMs ?? 0) / 2));
  }

  emit({ type: "report", report });
  emit({ type: "done" });
  return { requestId: crypto.randomUUID(), report };
}
