"use client";

/** Article detail view: a right-hand sheet over the database. */
import { ArrowUpRight, Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DemoBadge, Metric } from "@/components/ui/primitives";
import { cx, fmt } from "@/lib/format";
import type { Article } from "@/lib/data/types";
import { ChartTooltip } from "@/components/research/charts";

interface Props {
  article: Article | null;
  onClose: () => void;
  onResearch: (query: string, ids?: string[]) => void;
}

export default function ArticleDrawer({ article, onClose, onResearch }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeFn = useRef(onClose);
  closeFn.current = onClose;
  const [copied, setCopied] = useState(false);
  const open = !!article;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeFn.current();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const totalImp = article?.distribution.reduce((s, d) => s + d.impressions, 0) ?? 1;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // portalled to <body> so it always sits above the app bar, whatever the stacking context
  return createPortal(
    <div className={cx("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <div onClick={onClose} className={cx("absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={article?.headline ?? "Article"}
        className={cx(
          "absolute bottom-0 right-0 top-0 flex w-full max-w-[560px] flex-col border-l border-line bg-ink-950 transition-transform duration-500 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {article && (
          <>
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="pw-label">{article.id}</span>
                <DemoBadge />
              </div>
              <button ref={closeRef} type="button" onClick={onClose} aria-label="Close article" className="grid h-10 w-10 place-items-center text-mute hover:text-paper">
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-10 pt-6">
              <p className="pw-label">
                <span className={article.topic === "AI" ? "text-signal" : "text-paper/80"}>{article.topic}</span> · {fmt.date(article.publishedAt)} · {article.readMinutes} min
              </p>
              <h3 className="mt-3 font-display text-[34px] font-bold uppercase leading-[0.95]">{article.headline}</h3>
              <p className="mt-3 text-[14px] text-paper-dim">By {article.author}</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(article.url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1400);
                }}
                className="mt-3 inline-flex max-w-full items-center gap-2 font-mono text-[12px] text-mute hover:text-paper"
              >
                <span className="truncate">{fmt.path(article.url)}</span>
                <Copy className="h-3.5 w-3.5 shrink-0" />
                <span className="text-paper">{copied ? "Copied" : ""}</span>
              </button>

              <div className="mt-8 grid grid-cols-3 gap-x-6 gap-y-8 border-y border-line py-6">
                <Metric label="Views" value={fmt.compact(article.metrics.views)} />
                <Metric label="Engaged" value={fmt.duration(article.metrics.engagedSec)} />
                <Metric label="Read-through" value={fmt.pct(article.metrics.completion)} />
                <Metric label="Shares" value={fmt.compact(article.metrics.shares)} />
                <Metric label="Comments" value={fmt.int(article.metrics.comments)} />
                <Metric label="Subs gained" value={fmt.int(article.metrics.subsGained)} tone="focus" />
              </div>

              <p className="pw-label mt-8">Daily views · first 14 days</p>
              <div className="mt-3 h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={article.trend.map((v, i) => ({ day: `D${i + 1}`, views: v }))} margin={{ top: 6, right: 4, bottom: 0, left: -4 }}>
                    <defs>
                      <linearGradient id="drawerArea" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#EDEBE6" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#EDEBE6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fill: "#8C8C89", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} interval={1} />
                    <YAxis tickFormatter={(v) => fmt.compact(v)} tick={{ fill: "#8C8C89", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip content={<ChartTooltip format={(v) => fmt.int(v)} />} cursor={{ stroke: "rgba(255,255,255,0.25)" }} />
                    <Area type="monotone" dataKey="views" name="Views" stroke="#EDEBE6" strokeWidth={1.4} fill="url(#drawerArea)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <p className="pw-label mt-8">Social distribution</p>
              <ul className="mt-3 divide-y divide-line-faint border-y border-line">
                {[...article.distribution]
                  .sort((a, b) => b.impressions - a.impressions)
                  .map((d) => (
                    <li key={d.channel} className="grid grid-cols-[110px_1fr_auto] items-center gap-4 py-2.5 font-mono text-[12px]">
                      <span className="text-paper">{d.channel}</span>
                      <span className="h-1 bg-ink-800">
                        <span className="block h-1 bg-paper/75" style={{ width: `${(d.impressions / totalImp) * 100}%` }} />
                      </span>
                      <span className="text-right text-mute tabular">
                        {fmt.compact(d.impressions)} imp · {fmt.pct(d.clicks / Math.max(d.impressions, 1), 1)} CTR
                      </span>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="border-t border-line p-4">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onResearch(`Analyze performance of "${article.headline}"`, [article.id]);
                }}
                className="flex h-12 w-full items-center justify-between bg-paper px-5 font-mono text-[13px] text-black transition-colors hover:bg-white"
              >
                Research this article <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  ,
    document.body
  );
}
