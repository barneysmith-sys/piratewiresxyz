"use client";

/**
 * Analytical workspace: stage execution on the left, the report on the right.
 * Reads `?q=` and optional `?ids=` so every run is linkable.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import CapitolScene from "@/components/scene/CapitolScene";
import AppBar from "@/components/shell/AppBar";
import ArticleDrawer from "@/components/database/ArticleDrawer";
import type { Article } from "@/lib/data/types";
import type { DatasetMode } from "@/lib/data/mode";
import { STAGES } from "@/lib/research/types";
import { researchHref } from "@/lib/research/href";
import ReportView from "./ReportView";
import StageTracker from "./StageTracker";
import { useResearchRun } from "./useResearchRun";

export default function ResearchWorkspace() {
  const params = useSearchParams();
  const router = useRouter();
  const query = params.get("q") ?? "Analyze AI coverage performance and growth opportunities";
  const idsParam = params.get("ids");
  const datasetMode: DatasetMode = params.get("mode") === "analytical" ? "analytical" : "demo";
  const req = useMemo(
    () => ({ query, articleIds: idsParam ? idsParam.split(",").filter(Boolean) : undefined, mode: datasetMode }),
    [query, idsParam, datasetMode]
  );
  const { stages, report, status, progress, retry, error } = useResearchRun(req);
  const [articles, setArticles] = useState<Article[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const scroll = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/articles?mode=${datasetMode}`, { signal: ctrl.signal })
      .then(async (response) => {
        const body = (await response.json()) as { data?: { articles: Article[] } };
        if (response.ok) setArticles(body.data?.articles ?? []);
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [datasetMode]);

  const running = STAGES.find((s) => stages[s.id].status === "running");
  const lastSteps = STAGES.flatMap((s) => stages[s.id].steps.map((st) => ({ ...st, stage: s.title }))).slice(-6);

  const go = (q: string, ids?: string[]) => router.push(researchHref(q, ids, datasetMode));

  return (
    <div className="relative min-h-[100dvh] bg-black">
      {/* the landscape persists faintly overhead: same world, now a workspace */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-[460px] opacity-60 [mask-image:linear-gradient(to_bottom,black_30%,transparent)]">
        <CapitolScene progress={scroll} mode="ambient" className="absolute inset-0" />
      </div>
      <div aria-hidden className="pw-lattice pointer-events-none fixed inset-0 opacity-60" />

      <AppBar onSearch={(q) => go(q)} active="research" />

      {/* entrance wipe (continues the launch transition from the landing page) */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-30 bg-black transition-opacity duration-700 ease-out ${entered ? "opacity-0" : "opacity-100"}`}
      />

      <main className="relative z-10 mx-auto max-w-[1440px] px-4 pb-24 pt-24 md:px-8 md:pt-28">
        <p className="mb-8 border-l-2 border-signal bg-black/70 px-4 py-2.5 font-mono text-[11.5px] leading-relaxed text-paper-dim">
          {datasetMode === "demo"
            ? "Illustrative corpus. The stages run on the server against labelled demo records. These figures are not Pirate Wires performance."
            : "Analytical mode. Illustrative records are excluded. Empty measurements stay empty."}
        </p>

        <div className="grid gap-10 lg:grid-cols-[340px_1fr] lg:gap-14">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="pw-label">Query</p>
            <p className="mt-2 font-mono text-[15px] leading-snug text-paper">
              <span className="text-signal">›</span> {query}
            </p>
            {req.articleIds && <p className="mt-2 font-mono text-[11.5px] text-mute">Scoped to {req.articleIds.join(", ")}</p>}
            <div className="mt-8 border border-line bg-black/80 p-5 backdrop-blur-sm">
              <StageTracker stages={stages} progress={progress} />
              {(status === "done" || status === "error") && (
                <button type="button" onClick={retry} className="mt-4 inline-flex items-center gap-2 font-mono text-[11.5px] text-mute hover:text-paper">
                  <RotateCcw className="h-3.5 w-3.5" /> Run again
                </button>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            {error && (
              <div role="alert" className="border border-signal/50 bg-signal/[0.06] p-5 font-mono text-[13px] text-paper">
                Research failed: {error}
              </div>
            )}
            {!report && !error && (
              <div aria-live="polite" className="min-h-[60vh]">
                <p className="pw-label">{running ? `${running.index} · ${running.title}` : "Planning"}</p>
                <h1 className="mt-4 max-w-[18ch] font-display text-[44px] font-bold uppercase leading-[0.92] text-paper md:text-[68px]">{query}</h1>
                <div className="relative mt-10 h-px overflow-hidden bg-line">
                  <span className="absolute inset-y-0 left-0 w-1/3 animate-scan bg-gradient-to-r from-transparent via-signal to-transparent" />
                </div>
                <ul className="mt-6 space-y-2 font-mono text-[12.5px]">
                  {lastSteps.map((s) => (
                    <li key={s.id} className="animate-rise text-paper/85">
                      <span className="text-mute">{s.stage} ·</span> {s.label}
                      {s.detail && <span className="text-mute"> → {s.detail}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {report && <ReportView report={report} articles={articles} onOpenArticle={setOpenId} />}
          </div>
        </div>
      </main>

      <ArticleDrawer article={articles.find((a) => a.id === openId) ?? null} onClose={() => setOpenId(null)} onResearch={go} />
    </div>
  );
}
