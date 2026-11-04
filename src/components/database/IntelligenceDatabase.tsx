"use client";

/**
 * THE INTELLIGENCE DATABASE
 * Searchable, filterable, sortable article index. Selecting rows lets you
 * scope a research run to exactly those articles.
 */
import { ArrowDown, ArrowUp, ArrowUpRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { DemoBadge, Sparkline } from "@/components/ui/primitives";
import { cx, fmt } from "@/lib/format";
import type { DatasetMode } from "@/lib/data/mode";
import { TOPICS, type Article, type ObservedRecord, type Topic } from "@/lib/data/types";
import ArticleDrawer from "./ArticleDrawer";

type SortKey = "headline" | "author" | "publishedAt" | "topic" | "views" | "engagedSec" | "completion" | "subsGained";

const sortValue = (a: Article, k: SortKey): string | number => {
  switch (k) {
    case "views":
    case "engagedSec":
    case "completion":
    case "subsGained":
      return a.metrics[k];
    default:
      return a[k];
  }
};

interface Props {
  articles: Article[];
  observed?: ObservedRecord[];
  mode?: DatasetMode;
  onMode?: (mode: DatasetMode) => void;
  loading?: boolean;
  error?: string | null;
  onResearch: (query: string, articleIds?: string[]) => void;
}

export default function IntelligenceDatabase({ articles, observed = [], mode = "demo", onMode, loading = false, error = null, onResearch }: Props) {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<Topic | "All">("All");
  const [author, setAuthor] = useState("All");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "publishedAt", dir: -1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const authors = useMemo(() => [...new Set(articles.map((article) => article.author))].sort((a, b) => a.localeCompare(b)), [articles]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return articles
      .filter((a) => topic === "All" || a.topic === topic)
      .filter((a) => author === "All" || a.author === author)
      .filter((a) => !needle || `${a.headline} ${a.author} ${a.url} ${a.topic}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        const va = sortValue(a, sort.key);
        const vb = sortValue(b, sort.key);
        return (va > vb ? 1 : va < vb ? -1 : 0) * sort.dir;
      });
  }, [articles, q, topic, author, sort]);

  const totals = useMemo(() => {
    const views = rows.reduce((s, a) => s + a.metrics.views, 0);
    const engaged = rows.reduce((s, a) => s + a.metrics.engagedSec, 0) / Math.max(rows.length, 1);
    const subs = rows.reduce((s, a) => s + a.metrics.subsGained, 0);
    return { views, engaged, subs };
  }, [rows]);

  const observedViews = observed.reduce((sum, record) => sum + (record.views ?? 0), 0);
  const observedMeasured = observed.filter((record) => record.views != null).length;
  const maxViews = Math.max(...articles.map((a) => a.metrics.views), 1);
  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => {
    const activeSort = sort.key === k;
    return (
      <th scope="col" aria-sort={activeSort ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={cx("px-3 py-0 font-normal", className)}>
        <button
          type="button"
          onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : -1 }))}
          className={cx("pw-label inline-flex h-10 items-center gap-1 hover:text-paper", activeSort && "text-paper")}
        >
          {children}
          {activeSort ? sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : null}
        </button>
      </th>
    );
  };

  const openArticle = articles.find((a) => a.id === openId) ?? null;

  return (
    <section aria-labelledby="db-title" className="relative">
      {/* header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="pw-label mb-3 flex items-center gap-3">
            <span className="text-signal">01</span> Archive
          </p>
          <h2 id="db-title" className="font-display text-[40px] font-bold uppercase leading-[0.9] tracking-[-0.005em] md:text-[64px]">
            The Intelligence Database
          </h2>
        </div>
        <dl className="grid grid-cols-3 gap-6 md:gap-10">
          {(mode === "demo"
            ? [
                ["Illustrative records", fmt.int(rows.length)],
                ["Fixture views", fmt.compact(totals.views)],
                ["Fixture engaged", fmt.duration(totals.engaged)],
              ]
            : [
                ["Observed", fmt.int(observed.length)],
                ["Views", observed.length > 0 && observedMeasured === observed.length ? fmt.compact(observedViews) : "—"],
                ["Engaged", "—"],
              ]
          ).map(([k, v]) => (
            <div key={k}>
              <dt className="pw-label">{k}</dt>
              <dd className="mt-1 font-display text-[28px] font-semibold leading-none tabular md:text-[32px]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* toolbar */}
      <div className="mt-8 flex flex-col gap-3 border-y border-line py-3 lg:flex-row lg:items-center">
        <label className="relative flex h-10 min-w-0 items-center lg:w-[320px]">
          <span className="sr-only">Filter articles</span>
          <Search aria-hidden className="absolute left-3 h-4 w-4 text-mute" strokeWidth={1.6} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter headline, author, URL"
            className="h-full w-full border border-line bg-ink-900 pl-9 pr-8 font-mono text-[13px] text-paper outline-none placeholder:text-mute focus:border-line-strong"
          />
          {q && (
            <button type="button" aria-label="Clear filter" onClick={() => setQ("")} className="absolute right-1 grid h-8 w-8 place-items-center text-mute hover:text-paper">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
        <label className="flex h-10 items-center">
          <span className="sr-only">Author</span>
          <select
            value={authors.includes(author) || author === "All" ? author : "All"}
            onChange={(event) => setAuthor(event.target.value)}
            className="h-full border border-line bg-ink-900 px-3 font-mono text-[12px] text-paper outline-none focus:border-line-strong"
          >
            <option value="All">All authors</option>
            {authors.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <div role="group" aria-label="Topic" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:pb-0">
          {(["All", ...TOPICS] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={topic === t}
              onClick={() => setTopic(t)}
              className={cx(
                "h-9 shrink-0 border px-3 font-mono text-[12px] transition-colors",
                topic === t ? "border-signal bg-ink-800 text-paper" : "border-line text-paper/80 hover:border-line-strong hover:text-paper"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 lg:ml-auto">
          <div role="group" aria-label="Data mode" className="flex">
            {(["demo", "analytical"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={mode === item}
                onClick={() => onMode?.(item)}
                className={cx(
                  "h-9 border px-3 font-mono text-[12px]",
                  item === "analytical" && "-ml-px",
                  mode === item ? "border-signal bg-ink-800 text-paper" : "border-line text-paper/80 hover:text-paper"
                )}
              >
                {item === "demo" ? "Demo" : "Analytical"}
              </button>
            ))}
          </div>
          {mode === "demo" ? <DemoBadge /> : <span className="pw-label">Observed only</span>}
        </div>
      </div>

      {/* selection bar */}
      <div
        className={cx(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          selected.size ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-signal/[0.06] px-3 py-2.5 font-mono text-[12.5px]">
            <span className="text-paper">{selected.size} selected</span>
            <button type="button" className="text-mute underline-offset-4 hover:text-paper hover:underline" onClick={() => setSelected(new Set())}>
              Clear
            </button>
            <button
              type="button"
              onClick={() => onResearch(`Analyze performance of ${selected.size} selected article${selected.size > 1 ? "s" : ""}`, [...selected])}
              className="ml-auto inline-flex h-9 items-center gap-2 bg-paper px-4 text-black transition-colors hover:bg-white"
            >
              Research selected <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {loading && <p className="py-10 font-mono text-[13px] text-mute">Loading records…</p>}
      {error && (
        <p role="alert" className="border border-signal/50 bg-signal/[0.06] px-4 py-3 font-mono text-[13px] text-paper">
          {error}
        </p>
      )}
      {!loading && !error && articles.length === 0 && observed.length === 0 && (
        <div className="border border-line px-6 py-16">
          <p className="pw-label">{mode === "demo" ? "Illustrative corpus" : "Analytical archive"}</p>
          <p className="mt-4 max-w-[68ch] font-mono text-[13px] leading-relaxed text-paper-dim">
            {mode === "demo"
              ? "The demo corpus did not load. Illustrative performance figures never enter analytical totals."
              : "No observed articles are stored. Illustrative records stay in demo mode and are excluded here. Missing measurements are not shown as zero."}
          </p>
        </div>
      )}
      {!loading && !error && articles.length === 0 && observed.length > 0 && (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <caption className="sr-only">Observed articles. Illustrative records are excluded.</caption>
            <thead className="border-b border-line">
              <tr className="pw-label">
                <th className="px-3 py-3 font-normal">Headline</th>
                <th className="px-3 py-3 font-normal">Author</th>
                <th className="px-3 py-3 font-normal">Published</th>
                <th className="px-3 py-3 font-normal">Topic</th>
                <th className="px-3 py-3 text-right font-normal">Views</th>
              </tr>
            </thead>
            <tbody>
              {observed.map((record) => (
                <tr key={record.recordId} className="border-b border-line-faint">
                  <td className="px-3 py-3 text-[14.5px] text-paper">{record.headline}</td>
                  <td className="px-3 py-3 text-[13px] text-paper-dim">{record.author}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-paper-dim">{record.publishedAt ? fmt.shortDate(record.publishedAt) : "—"}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-paper/80">{record.topic ?? "—"}</td>
                  <td className="px-3 py-3 text-right font-mono text-[13px] tabular">{record.views == null ? "—" : fmt.compact(record.views)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 font-mono text-[11.5px] text-mute">
            Source names are on each row. Engaged time, read-through and subscriptions are unmeasured, so they are omitted.
          </p>
        </div>
      )}

      {/* table */}
      {!loading && !error && articles.length > 0 && <div className="relative overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <caption className="sr-only">{mode === "demo" ? "Illustrative articles. Not Pirate Wires performance." : "Articles."}</caption>
          <thead className="border-b border-line">
            <tr>
              <th scope="col" className="w-10 px-3">
                <input
                  type="checkbox"
                  aria-label="Select all visible"
                  checked={allVisibleSelected}
                  onChange={() =>
                    setSelected((s) => {
                      const n = new Set(s);
                      rows.forEach((r) => (allVisibleSelected ? n.delete(r.id) : n.add(r.id)));
                      return n;
                    })
                  }
                  className="pw-check"
                />
              </th>
              <Th k="headline">Headline</Th>
              <Th k="author">Author</Th>
              <Th k="publishedAt">Published</Th>
              <Th k="topic">Topic</Th>
              <th scope="col" className="pw-label px-3 font-normal">
                Distribution
              </th>
              <Th k="views" className="text-right">
                {mode === "demo" ? "Fixture views" : "Views"}
              </Th>
              <Th k="engagedSec" className="text-right">
                {mode === "demo" ? "Fixture engaged" : "Engaged"}
              </Th>
              <Th k="completion" className="text-right">
                {mode === "demo" ? "Fixture read-through" : "Read-through"}
              </Th>
              <th scope="col" className="pw-label px-3 font-normal">
                14-day trend
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const isSel = selected.has(a.id);
              const totalImp = a.distribution.reduce((s, d) => s + d.impressions, 0) || 1;
              const top = [...a.distribution].sort((x, y) => y.impressions - x.impressions);
              return (
                <tr
                  key={a.id}
                  onClick={() => setOpenId(a.id)}
                  className={cx(
                    "group cursor-pointer border-b border-line-faint transition-colors duration-100 hover:bg-ink-800/70",
                    isSel && "bg-signal/[0.05]"
                  )}
                >
                  <td className="px-3 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`Select ${a.headline}`} checked={isSel} onChange={() => toggle(a.id)} className="pw-check mt-1" />
                  </td>
                  <td className="max-w-[380px] px-3 py-3 align-top">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenId(a.id);
                      }}
                      className="text-left text-[14.5px] font-medium leading-snug text-paper decoration-signal underline-offset-4 group-hover:underline"
                    >
                      {a.headline}
                    </button>
                    <span className="mt-1 block truncate font-mono text-[11px] text-mute">{fmt.path(a.url)}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 align-top text-[13px] text-paper-dim">{a.author}</td>
                  <td className="whitespace-nowrap px-3 py-3 align-top font-mono text-[12px] text-paper-dim tabular">{fmt.shortDate(a.publishedAt)}</td>
                  <td className="px-3 py-3 align-top">
                    <span className="inline-block border border-line-strong px-1.5 py-[1px] font-mono text-[11px] text-paper/80">
                      {a.topic}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex h-1.5 w-[112px] overflow-hidden bg-ink-800" title={top.map((d) => `${d.channel}: ${fmt.compact(d.impressions)}`).join("\n")}>
                      {top.map((d, i) => (
                        <span
                          key={d.channel}
                          style={{ width: `${(d.impressions / totalImp) * 100}%`, opacity: 1 - i * 0.14 }}
                          className={cx("h-full border-r border-void", i === 0 ? "bg-paper" : "bg-amber/70")}
                        />
                      ))}
                    </div>
                    <span className="mt-1.5 block font-mono text-[11px] text-mute">
                      {top[0].channel} · {top[1]?.channel}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right align-top">
                    <span className="font-mono text-[13px] text-paper tabular">{fmt.compact(a.metrics.views)}</span>
                    <span className="ml-auto mt-1.5 block h-px bg-ink-700">
                      <span className="block h-px bg-paper/60" style={{ width: `${(a.metrics.views / maxViews) * 100}%`, marginLeft: "auto" }} />
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right align-top font-mono text-[13px] text-paper-dim tabular">{fmt.duration(a.metrics.engagedSec)}</td>
                  <td className="px-3 py-3 text-right align-top font-mono text-[13px] text-paper-dim tabular">{fmt.pct(a.metrics.completion)}</td>
                  <td className="px-3 py-2.5 align-top">
                    <Sparkline values={a.trend} />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-16 text-center font-mono text-[13px] text-mute">
                  No articles match. <button className="text-paper underline underline-offset-4" onClick={() => { setQ(""); setTopic("All"); setAuthor("All"); }}>Reset filters</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-4 font-mono text-[11.5px] text-mute">
          {mode === "demo"
            ? "Headlines, bylines, dates and URLs are from the public Pirate Wires archive. Views, engaged time, read-through and distribution are illustrative and are not Pirate Wires performance."
            : "Observed records only."}
        </p>
      </div>}

      <ArticleDrawer article={openArticle} onClose={() => setOpenId(null)} onResearch={onResearch} />
    </section>
  );
}
