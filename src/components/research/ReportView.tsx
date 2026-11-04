"use client";

/** The research report. Every claim links to the articles that support it. */
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { DemoBadge, SectionLabel } from "@/components/ui/primitives";
import { cx, fmt } from "@/lib/format";
import type { Article } from "@/lib/data/types";
import type { ResearchReport } from "@/lib/research/types";
import { STAGES } from "@/lib/research/types";
import { ChannelBars, DistributionNetwork, TopicComparison, WeeklyTrend } from "./charts";

interface Props {
  report: ResearchReport;
  articles: Article[];
  onOpenArticle: (id: string) => void;
}

function Block({ id, index, title, children, className }: { id?: string; index: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className={cx("animate-rise border-t border-line pt-6", className)}>
      <SectionLabel index={index}>{title}</SectionLabel>
      <div className="mt-5">{children}</div>
    </section>
  );
}

const stageTitle = (id: string) => STAGES.find((s) => s.id === id)?.title ?? id;

function AuthorComparison({ articles, illustrative }: { articles: Article[]; illustrative: boolean }) {
  const rows = [...articles.reduce((map, article) => {
    const current = map.get(article.author) ?? { author: article.author, articles: 0, views: 0 };
    current.articles += 1;
    current.views += article.metrics.views;
    map.set(article.author, current);
    return map;
  }, new Map<string, { author: string; articles: number; views: number }>()).values()].sort(
    (a, b) => b.articles - a.articles || b.views - a.views || a.author.localeCompare(b.author),
  );
  const max = Math.max(...rows.map((row) => row.articles), 1);

  if (rows.length === 0) {
    return <p className="font-mono text-[13px] text-mute">No authors in this scope.</p>;
  }

  return (
    <ul className="divide-y divide-line-faint border-y border-line">
      {rows.map((row) => (
        <li key={row.author} className="grid grid-cols-[minmax(0,1fr)_72px_88px] items-center gap-4 py-3 md:grid-cols-[180px_1fr_88px_88px]">
          <span className="truncate text-[14px] text-paper">{row.author}</span>
          <span className="hidden h-1 bg-ink-800 md:block">
            <span className="block h-1 bg-paper/70" style={{ width: `${(row.articles / max) * 100}%` }} />
          </span>
          <span className="text-right font-mono text-[12px] text-paper-dim tabular">{row.articles} {row.articles === 1 ? "piece" : "pieces"}</span>
          <span className="text-right font-mono text-[12px] text-mute tabular">{illustrative ? `${fmt.compact(row.views)} fixture` : row.views ? fmt.compact(row.views) : "—"}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ReportView({ report, articles, onOpenArticle }: Props) {
  const byId = new Map(articles.map((a) => [a.id, a]));
  const scoped = report.articleIds.map((id) => byId.get(id)).filter(Boolean) as Article[];
  const ranked = report.topArticles.map((t) => ({ ...t, a: byId.get(t.id)! })).filter((t) => t.a);
  const focusLabel = report.focusTopic ?? "Selection";

  return (
    <article className="space-y-12">
      {/* header */}
      <header className="animate-rise">
        <div className="flex flex-wrap items-center gap-3">
          <DemoBadge>{report.provenance === "simulated" ? "Simulated run · demo data" : "Live run"}</DemoBadge>
          <span className="font-mono text-2xs uppercase text-mute">
            Scope: {report.scopeLabel} · {new Date(report.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>
        <h2 className="mt-5 font-display text-[40px] font-bold uppercase leading-[0.92] md:text-[60px]">{report.headline}</h2>
        <p className="mt-5 max-w-[68ch] text-[16px] leading-relaxed text-paper-dim">{report.summary}</p>

        <dl className="mt-8 grid grid-cols-2 border-y border-line md:grid-cols-4">
          {report.kpis.map((k, i) => (
            <div key={k.label} className={cx("py-5 pr-4", i > 0 && "md:border-l md:border-line md:pl-5", i % 2 === 1 && "border-l border-line pl-5 md:pl-5")}>
              <dt className="pw-label">{k.label}</dt>
              <dd className="mt-2 flex items-baseline gap-3">
                <span className="font-display text-[38px] font-semibold leading-none tabular">{k.value}</span>
                {k.delta && (
                  <span className={cx("inline-flex items-center gap-0.5 font-mono text-[12px] tabular", k.deltaTone === "up" ? "text-paper" : k.deltaTone === "down" ? "text-amber" : "text-mute")}>
                    {k.deltaTone === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : k.deltaTone === "down" ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                    {k.delta}
                  </span>
                )}
                {k.note && <span className="font-mono text-[12px] text-mute">{k.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      {/* findings */}
      <Block id="findings" index="A" title="Findings · evidence-linked">
        <ol className="grid gap-px bg-line md:grid-cols-2">
          {report.findings.map((f) => (
            <li key={f.id} id={`finding-${f.id}`} className="flex flex-col bg-ink-950 p-5 md:p-6">
              <div className="flex items-center gap-3 font-mono text-2xs uppercase">
                <span className="text-signal">{f.id}</span>
                <span className="text-mute">{stageTitle(f.stage)}</span>
                <span className={cx("ml-auto", f.confidence === "High" ? "text-paper" : "text-mute")}>Confidence · {f.confidence}</span>
              </div>
              <h3 className="mt-3 text-[18px] font-semibold leading-snug text-paper">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-paper-dim">{f.body}</p>
              {f.evidence.length > 0 && (
                <div className="mt-auto pt-4">
                  <p className="pw-label mb-2">Evidence</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {f.evidence.map((e) => (
                      <li key={e.articleId + e.metric}>
                        <button
                          type="button"
                          onClick={() => onOpenArticle(e.articleId)}
                          title={byId.get(e.articleId)?.headline}
                          className="inline-flex items-center gap-2 border border-line px-2 py-1 font-mono text-[11px] text-paper/85 transition-colors hover:border-paper hover:text-paper"
                        >
                          <span className="text-mute">{e.articleId}</span>
                          <span>
                            {e.metric} {e.value}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ol>
      </Block>

      {/* performance */}
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
        <Block index="B" title={`${report.provenance === "simulated" ? "Weekly fixture views" : "Weekly views"} · ${focusLabel} vs other topics`}>
          <WeeklyTrend data={report.weekly} focusLabel={focusLabel} />
        </Block>
        <Block index="C" title="Topic comparison">
          <TopicComparison rows={report.topics} focus={report.focusTopic} />
        </Block>
      </div>

      <Block index="D" title="Author comparison">
        <p className="mb-4 max-w-[68ch] font-mono text-[12px] text-mute">
          {report.provenance === "simulated"
            ? "Authors inside this illustrative scope. Counts and fixture views are not a ranking of Pirate Wires writers."
            : "Primary authors on the observed articles in this scope. Frequency is not an engagement ranking."}
        </p>
        <AuthorComparison articles={scoped} illustrative={report.provenance === "simulated"} />
      </Block>

      {/* distribution */}
      <Block index="E" title="Distribution network">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
          <DistributionNetwork channels={report.channels} articles={ranked.map((r) => r.a).concat(scoped.filter((a) => !ranked.some((r) => r.id === a.id)))} scopeLabel={focusLabel} />
          <ChannelBars rows={report.channels.filter((c) => c.focusImpressions > 0)} />
        </div>
      </Block>

      {/* article-level */}
      <Block index="F" title="Article-level analysis">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="pw-label border-b border-line">
                <th scope="col" className="w-10 py-2 font-normal">#</th>
                <th scope="col" className="py-2 font-normal">Article</th>
                <th scope="col" className="py-2 font-normal">Score</th>
                <th scope="col" className="py-2 text-right font-normal">Views</th>
                <th scope="col" className="py-2 text-right font-normal">Engaged</th>
                <th scope="col" className="py-2 text-right font-normal">Subs</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => (
                <tr key={r.id} className="border-b border-line-faint">
                  <td className="py-3 font-mono text-[12px] text-mute tabular">{String(i + 1).padStart(2, "0")}</td>
                  <td className="py-3 pr-4">
                    <button type="button" onClick={() => onOpenArticle(r.id)} className="text-left text-[14.5px] font-medium text-paper decoration-signal underline-offset-4 hover:underline">
                      {r.a.headline}
                    </button>
                    <span className="mt-0.5 block font-mono text-[11px] text-mute">
                      {r.a.author} · {fmt.shortDate(r.a.publishedAt)} · {r.reason}
                    </span>
                  </td>
                  <td className="w-[180px] py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-1 flex-1 bg-ink-800">
                        <span className={cx("block h-1", i === 0 ? "bg-signal" : "bg-paper/70")} style={{ width: `${r.score}%` }} />
                      </span>
                      <span className="w-7 text-right font-mono text-[12px] text-paper tabular">{r.score}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right font-mono text-[12.5px] text-paper-dim tabular">{fmt.compact(r.a.metrics.views)}</td>
                  <td className="py-3 text-right font-mono text-[12.5px] text-paper-dim tabular">{fmt.duration(r.a.metrics.engagedSec)}</td>
                  <td className="py-3 text-right font-mono text-[12.5px] text-paper-dim tabular">{fmt.int(r.a.metrics.subsGained)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>

      {/* recommendations */}
      <Block index="G" title="Growth recommendations">
        <ol className="divide-y divide-line border-y border-line">
          {report.recommendations.map((r, i) => (
            <li key={r.id} className="grid gap-4 py-6 md:grid-cols-[64px_1fr_180px]">
              <span className="font-display text-[44px] font-bold leading-none text-signal">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="text-[19px] font-semibold text-paper">{r.title}</h3>
                <p className="mt-2 max-w-[70ch] text-[14.5px] leading-relaxed text-paper-dim">{r.body}</p>
                <p className="mt-3 font-mono text-[11px] text-mute">
                  Based on{" "}
                  {r.basis.map((b, j) => (
                    <span key={b}>
                      {j > 0 && ", "}
                      <a href={`#finding-${b}`} className="text-paper underline decoration-line-strong underline-offset-4 hover:decoration-paper">
                        {b}
                      </a>
                    </span>
                  ))}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3 self-start font-mono text-[11px] md:grid-cols-1">
                <div className="flex justify-between border-b border-line-faint pb-1.5">
                  <dt className="text-mute">Impact</dt>
                  <dd className={r.impact === "High" ? "text-paper" : "text-paper-dim"}>{r.impact}</dd>
                </div>
                <div className="flex justify-between border-b border-line-faint pb-1.5">
                  <dt className="text-mute">Effort</dt>
                  <dd className="text-paper-dim">{r.effort}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </Block>

      <Block index="H" title="Limitations">
        <ul className="space-y-2 font-mono text-[12px] text-mute">
          {report.limitations.map((l) => (
            <li key={l} className="flex gap-3">
              <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 bg-signal" />
              {l}
            </li>
          ))}
        </ul>
      </Block>
    </article>
  );
}
