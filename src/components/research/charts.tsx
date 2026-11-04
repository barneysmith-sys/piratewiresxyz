"use client";

/**
 * Report visualisations. One rule: red marks the thing being asked about,
 * everything else is off-white/grey.
 */
import { useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { series } from "@/lib/design/tokens";
import { cx, fmt } from "@/lib/format";
import type { Article } from "@/lib/data/types";
import type { ChannelRow, TopicRow } from "@/lib/research/types";

const axisTick = { fill: "#8C8C89", fontSize: 10.5, fontFamily: "var(--font-mono)" };

export function ChartTooltip({
  active,
  payload,
  label,
  format = (v: number) => fmt.compact(v),
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; stroke?: string; fill?: string }[];
  label?: string;
  format?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-line-strong bg-black/95 px-3 py-2 font-mono text-[11px] shadow-xl">
      {label && <p className="mb-1 text-mute">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-paper">
          <span className="h-2 w-2" style={{ background: p.stroke && p.stroke !== "none" ? p.stroke : p.fill ?? p.color }} />
          <span className="text-paper/70">{p.name}</span>
          <span className="ml-auto pl-4 tabular">{format(p.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

type TopicMetric = "avgViews" | "avgEngagedSec" | "completion" | "subsPer1k";
const TOPIC_METRICS: { key: TopicMetric; label: string; f: (v: number) => string }[] = [
  { key: "avgViews", label: "Avg views", f: fmt.compact },
  { key: "avgEngagedSec", label: "Engaged", f: fmt.duration },
  { key: "completion", label: "Read-through", f: (v) => fmt.pct(v) },
  { key: "subsPer1k", label: "Subs / 1k", f: (v) => v.toFixed(1) },
];

export function TopicComparison({ rows, focus }: { rows: TopicRow[]; focus: string | null }) {
  const [metric, setMetric] = useState<TopicMetric>("avgViews");
  const m = TOPIC_METRICS.find((x) => x.key === metric)!;
  const data = useMemo(() => [...rows].sort((a, b) => b[metric] - a[metric]), [rows, metric]);
  return (
    <div>
      <div role="tablist" aria-label="Topic metric" className="mb-4 flex flex-wrap gap-1">
        {TOPIC_METRICS.map((x) => (
          <button
            key={x.key}
            role="tab"
            aria-selected={metric === x.key}
            onClick={() => setMetric(x.key)}
            className={cx("h-8 border px-2.5 font-mono text-[11.5px]", metric === x.key ? "border-paper text-paper" : "border-line text-mute hover:text-paper")}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={7}>
            <CartesianGrid horizontal={false} stroke={series.grid} />
            <XAxis type="number" tick={axisTick} tickFormatter={m.f} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="topic" tick={{ ...axisTick, fill: "#C9C7C1" }} width={88} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip format={m.f} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey={metric} name={m.label} isAnimationActive>
              {data.map((d) => (
                <Cell key={d.topic} fill={d.topic === focus ? series.focus : "rgba(237,235,230,0.55)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function WeeklyTrend({ data, focusLabel }: { data: { week: string; focus: number; rest: number }[]; focusLabel: string }) {
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="focusArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={series.focus} stopOpacity={0.28} />
              <stop offset="100%" stopColor={series.focus} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={series.grid} />
          <XAxis dataKey="week" tick={axisTick} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} minTickGap={16} />
          <YAxis tick={axisTick} tickFormatter={fmt.compact} axisLine={false} tickLine={false} width={48} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.25)" }} />
          <Line type="monotone" dataKey="rest" name="Other topics" stroke={series.secondary} strokeWidth={1.2} strokeDasharray="3 3" dot={false} />
          <Area type="monotone" dataKey="focus" name={focusLabel} stroke={series.focus} strokeWidth={1.6} fill="url(#focusArea)" dot={{ r: 2, fill: series.focus, strokeWidth: 0 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChannelBars({ rows }: { rows: ChannelRow[] }) {
  const max = Math.max(...rows.map((r) => Math.max(r.focusCtr, r.baseCtr)), 0.0001);
  return (
    <table className="w-full font-mono text-[12px]">
      <caption className="sr-only">Click-through by channel, this scope versus other topics</caption>
      <thead>
        <tr className="pw-label text-left">
          <th scope="col" className="pb-2 font-normal">Channel</th>
          <th scope="col" className="pb-2 font-normal">CTR · scope vs other</th>
          <th scope="col" className="pb-2 text-right font-normal">Impr.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.channel} className="border-t border-line-faint">
            <td className="py-2 pr-3 text-paper">{r.channel}</td>
            <td className="w-[55%] py-2 pr-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-[5px] bg-signal" style={{ width: `${(r.focusCtr / max) * 100}%` }} />
                  <span className="text-paper tabular">{fmt.pct(r.focusCtr, 1)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-[5px] bg-paper/35" style={{ width: `${(r.baseCtr / max) * 100}%` }} />
                  <span className="text-mute tabular">{fmt.pct(r.baseCtr, 1)}</span>
                </div>
              </div>
            </td>
            <td className="py-2 text-right text-paper-dim tabular">{fmt.compact(r.focusImpressions)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Distribution network: scope → channels → articles.
 * Channel node area ∝ impressions; red ring = click-through above other topics.
 */
export function DistributionNetwork({ channels, articles, scopeLabel }: { channels: ChannelRow[]; articles: Article[]; scopeLabel: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const W = 680;
  const H = 380;
  const cx0 = W / 2;
  const cy0 = H / 2;
  const live = channels.filter((c) => c.focusImpressions > 0);
  const maxImp = Math.max(...live.map((c) => c.focusImpressions), 1);

  const chNodes = live.map((c, i) => {
    const a = -Math.PI / 2 + (i / live.length) * Math.PI * 2;
    return { ...c, x: cx0 + Math.cos(a) * 170, y: cy0 + Math.sin(a) * 112, r: 5 + Math.sqrt(c.focusImpressions / maxImp) * 15, a };
  });
  const arts = articles.slice(0, 10).map((art, i, arr) => {
    const a = -Math.PI / 2 + ((i + 0.5) / arr.length) * Math.PI * 2;
    const top = [...art.distribution].sort((p, q) => q.impressions - p.impressions).slice(0, 2);
    return { art, x: cx0 + Math.cos(a) * 310, y: cy0 + Math.sin(a) * 170, top };
  });
  const active = hover ? chNodes.find((c) => c.channel === hover) : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Distribution network for ${scopeLabel}: channels sized by impressions, linked to articles`}>
        {/* article ↔ channel */}
        {arts.map(({ art, x, y, top }) =>
          top.map((d) => {
            const c = chNodes.find((n) => n.channel === d.channel);
            if (!c) return null;
            const on = !hover || hover === c.channel;
            return <line key={art.id + d.channel} x1={x} y1={y} x2={c.x} y2={c.y} stroke={on ? "rgba(237,235,230,0.35)" : "rgba(237,235,230,0.06)"} strokeWidth={0.8} />;
          })
        )}
        {/* scope ↔ channel */}
        {chNodes.map((c) => (
          <line
            key={"s" + c.channel}
            x1={cx0}
            y1={cy0}
            x2={c.x}
            y2={c.y}
            stroke={!hover || hover === c.channel ? "rgba(227,38,43,0.65)" : "rgba(227,38,43,0.12)"}
            strokeWidth={0.6 + (c.focusImpressions / maxImp) * 3}
          />
        ))}
        {/* articles */}
        {arts.map(({ art, x, y }) => (
          <g key={art.id}>
            <rect x={x - 3} y={y - 3} width={6} height={6} fill="none" stroke="rgba(237,235,230,0.8)" strokeWidth={1} />
            <text x={x + (x > cx0 ? 8 : -8)} y={y + 3.5} textAnchor={x > cx0 ? "start" : "end"} fill="#8C8C89" fontSize="9.5" fontFamily="var(--font-mono)">
              {art.id}
            </text>
          </g>
        ))}
        {/* channels */}
        {chNodes.map((c) => {
          const above = c.focusCtr > c.baseCtr;
          return (
            <g
              key={c.channel}
              tabIndex={0}
              role="button"
              aria-label={`${c.channel}: ${fmt.compact(c.focusImpressions)} impressions, ${fmt.pct(c.focusCtr, 1)} click-through`}
              onMouseEnter={() => setHover(c.channel)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(c.channel)}
              onBlur={() => setHover(null)}
              className="cursor-pointer outline-none"
            >
              <rect x={c.x - c.r} y={c.y - c.r} width={c.r * 2} height={c.r * 2} fill="#000" stroke={above ? "#E3262B" : "rgba(237,235,230,0.7)"} strokeWidth={1.2} />
              <rect x={c.x - c.r * 0.45} y={c.y - c.r * 0.45} width={c.r * 0.9} height={c.r * 0.9} fill={above ? "#E3262B" : "#EDEBE6"} opacity={0.9} />
              <text
                x={c.x}
                y={c.y + (Math.sin(c.a) >= 0 ? c.r + 14 : -c.r - 7)}
                textAnchor="middle"
                fill={hover === c.channel ? "#EDEBE6" : "#C9C7C1"}
                fontSize="11"
                fontFamily="var(--font-mono)"
              >
                {c.channel}
              </text>
            </g>
          );
        })}
        {/* scope */}
        <rect x={cx0 - 10} y={cy0 - 10} width={20} height={20} fill="#E3262B" />
        <text x={cx0} y={cy0 + 30} textAnchor="middle" fill="#EDEBE6" fontSize="11" fontFamily="var(--font-mono)">
          {scopeLabel.toUpperCase()}
        </text>
      </svg>
      <div className="mt-2 flex min-h-[20px] flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] text-mute">
        {active ? (
          <span className="text-paper">
            {active.channel} · {fmt.compact(active.focusImpressions)} impressions · {fmt.pct(active.focusCtr, 1)} CTR (other topics {fmt.pct(active.baseCtr, 1)}) · {active.focusPosts} posts
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-signal" /> CTR above other topics</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-paper" /> At or below</span>
            <span>Node size = impressions · hover a channel</span>
          </>
        )}
      </div>
    </div>
  );
}
