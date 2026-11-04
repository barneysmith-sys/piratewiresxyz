/**
 * Deterministic analysis over an article set.
 *
 * The simulator uses this to build its report so every number on screen is
 * actually computed from the (demo) dataset rather than invented. A live
 * backend can reuse the same shapes with richer sources.
 */
import { fmt } from "@/lib/format";
import { CHANNELS, TOPICS, type Article, type Topic } from "@/lib/data/types";
import type { ChannelRow, Finding, Recommendation, ResearchReport, ResearchRequest, TopicRow } from "./types";

export function detectTopic(query: string): Topic | null {
  const q = query.toLowerCase();
  // longest names first so "tech policy" wins over shorter matches
  const sorted = [...TOPICS].sort((a, b) => b.length - a.length);
  for (const t of sorted) {
    const re = t === "AI" ? /\b(ai|a\.i\.|artificial intelligence)\b/ : new RegExp(`\\b${t.toLowerCase()}\\b`);
    if (re.test(q)) return t;
  }
  return null;
}

export function resolveScope(req: ResearchRequest, all: Article[]) {
  if (req.articleIds?.length) {
    const set = new Set(req.articleIds);
    const focus = all.filter((a) => set.has(a.id));
    return { defaulted: false, focus, rest: all.filter((a) => !set.has(a.id)), topic: null as Topic | null, label: `${focus.length} selected article${focus.length > 1 ? "s" : ""}` };
  }
  const detected = detectTopic(req.query);
  const topic = detected ?? "AI";
  return {
    focus: all.filter((a) => a.topic === topic),
    rest: all.filter((a) => a.topic !== topic),
    topic,
    label: `${topic} coverage`,
    defaulted: !detected,
  };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export function topicTable(all: Article[]): TopicRow[] {
  return TOPICS.map((topic) => {
    const xs = all.filter((a) => a.topic === topic);
    const views = xs.reduce((s, a) => s + a.metrics.views, 0);
    return {
      topic,
      articles: xs.length,
      avgViews: mean(xs.map((a) => a.metrics.views)),
      avgEngagedSec: mean(xs.map((a) => a.metrics.engagedSec)),
      completion: mean(xs.map((a) => a.metrics.completion)),
      subsPer1k: views ? (xs.reduce((s, a) => s + a.metrics.subsGained, 0) / views) * 1000 : 0,
    };
  })
    .filter((r) => r.articles > 0)
    .sort((a, b) => b.avgViews - a.avgViews);
}

export function channelTable(focus: Article[], rest: Article[]): ChannelRow[] {
  const agg = (xs: Article[], ch: string) => {
    let imp = 0,
      clk = 0,
      posts = 0;
    for (const a of xs)
      for (const d of a.distribution)
        if (d.channel === ch) {
          imp += d.impressions;
          clk += d.clicks;
          posts += d.posts;
        }
    return { imp, clk, posts };
  };
  return CHANNELS.map((channel) => {
    const f = agg(focus, channel);
    const b = agg(rest, channel);
    return {
      channel,
      focusImpressions: f.imp,
      baseImpressions: b.imp,
      focusCtr: f.imp ? f.clk / f.imp : 0,
      baseCtr: b.imp ? b.clk / b.imp : 0,
      focusPosts: f.posts,
    };
  }).sort((a, b) => b.focusImpressions - a.focusImpressions);
}

function weekKey(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function weeklySeries(focus: Article[], rest: Article[]) {
  const keys = [...new Set([...focus, ...rest].map((a) => weekKey(a.publishedAt)))].sort();
  return keys.map((k) => ({
    week: fmt.shortDate(k),
    focus: focus.filter((a) => weekKey(a.publishedAt) === k).reduce((s, a) => s + a.metrics.views, 0),
    rest: rest.filter((a) => weekKey(a.publishedAt) === k).reduce((s, a) => s + a.metrics.views, 0),
  }));
}

/** composite: reach × attention × conversion, normalised to the set */
export function scoreArticles(xs: Article[]) {
  const maxV = Math.max(...xs.map((a) => a.metrics.views), 1);
  const maxE = Math.max(...xs.map((a) => a.metrics.engagedSec), 1);
  const maxS = Math.max(...xs.map((a) => a.metrics.subsGained / a.metrics.views), 1e-9);
  return xs
    .map((a) => {
      const reach = a.metrics.views / maxV;
      const attention = (a.metrics.engagedSec / maxE) * 0.6 + a.metrics.completion * 0.4;
      const conv = a.metrics.subsGained / a.metrics.views / maxS;
      const score = Math.round((reach * 0.4 + attention * 0.35 + conv * 0.25) * 100);
      const best = [
        ["reach", reach],
        ["attention", attention],
        ["conversion", conv],
      ].sort((p, q) => (q[1] as number) - (p[1] as number))[0][0];
      return { a, score, best: best as string };
    })
    .sort((p, q) => q.score - p.score);
}

export function buildReport(req: ResearchRequest, all: Article[], provenance: "simulated" | "live" = "simulated"): ResearchReport {
  const { focus, rest, topic, label, defaulted } = resolveScope(req, all);
  const fv = mean(focus.map((a) => a.metrics.views));
  const rv = mean(rest.map((a) => a.metrics.views));
  const fe = mean(focus.map((a) => a.metrics.engagedSec));
  const re = mean(rest.map((a) => a.metrics.engagedSec));
  const fc = mean(focus.map((a) => a.metrics.completion));
  const rc = mean(rest.map((a) => a.metrics.completion));
  const fSubs = focus.reduce((s, a) => s + a.metrics.subsGained, 0);
  const fViews = focus.reduce((s, a) => s + a.metrics.views, 0);
  const rSubs = rest.reduce((s, a) => s + a.metrics.subsGained, 0);
  const rViews = rest.reduce((s, a) => s + a.metrics.views, 0);
  const fConv = fViews ? (fSubs / fViews) * 1000 : 0;
  const rConv = rViews ? (rSubs / rViews) * 1000 : 0;
  const lift = rv ? fv / rv - 1 : 0;

  const channels = channelTable(focus, rest);
  const scored = scoreArticles(focus);
  const topics = topicTable(all);
  const weekly = weeklySeries(focus, rest);

  // ---- distribution opportunity: best CTR channel that isn't already a top-2 volume channel
  const volumeTop = channels.slice(0, 2).map((c) => c.channel);
  const opp = [...channels].filter((c) => c.focusImpressions > 0 && !volumeTop.includes(c.channel)).sort((a, b) => b.focusCtr - a.focusCtr)[0];
  const lead = channels[0];

  // ---- long tail: share of 14-day views after day 3
  const tail = (a: Article) => a.trend.slice(3).reduce((s, v) => s + v, 0) / Math.max(1, a.trend.reduce((s, v) => s + v, 0));
  const fTail = mean(focus.map(tail));
  const rTail = mean(rest.map(tail));
  const longest = [...focus].sort((a, b) => tail(b) - tail(a))[0];

  const ev = (a: Article, metric: string, value: string) => ({ articleId: a.id, metric, value });
  const top = scored.slice(0, 3);

  const findings: Finding[] = [
    {
      id: "F1",
      stage: "performance",
      title: `${label[0].toUpperCase() + label.slice(1)} ${lift >= 0 ? "outperforms" : "trails"} the rest of the archive on reach`,
      body: `Average views per article are ${fmt.compact(fv)} against ${fmt.compact(rv)} elsewhere (${fmt.signedPct(lift)}). Engaged time is ${fmt.duration(fe)} vs ${fmt.duration(re)}.`,
      confidence: focus.length >= 6 ? "High" : "Medium",
      evidence: top.map((t) => ev(t.a, "views", fmt.compact(t.a.metrics.views))),
    },
    {
      id: "F2",
      stage: "performance",
      title: `Conversion runs at ${fConv.toFixed(1)} subscriptions per 1k views`,
      body: `Compared with ${rConv.toFixed(1)} for other coverage. The strongest converters combine above-median read-through with a clear explanatory frame.`,
      confidence: "Medium",
      evidence: [...focus]
        .sort((a, b) => b.metrics.subsGained / b.metrics.views - a.metrics.subsGained / a.metrics.views)
        .slice(0, 3)
        .map((a) => ev(a, "subs / 1k views", ((a.metrics.subsGained / a.metrics.views) * 1000).toFixed(1))),
    },
    {
      id: "F3",
      stage: "distribution",
      title: `${lead?.channel ?? "Newsletter"} carries the volume; ${opp?.channel ?? "Hacker News"} converts attention best`,
      body: opp
        ? `${opp.channel} delivers a ${fmt.pct(opp.focusCtr, 1)} click-through on this coverage (vs ${fmt.pct(opp.baseCtr, 1)} for other topics) from only ${opp.focusPosts} posts.`
        : "No secondary channel stands out on click-through in this scope.",
      confidence: "Medium",
      evidence: opp
        ? focus
            .map((a) => ({ a, d: a.distribution.find((d) => d.channel === opp.channel) }))
            .filter((x) => x.d)
            .sort((p, q) => q.d!.impressions - p.d!.impressions)
            .slice(0, 3)
            .map((x) => ev(x.a, `${opp.channel} impressions`, fmt.compact(x.d!.impressions)))
        : [],
    },
    {
      id: "F4",
      stage: "audience",
      title: `Readers stay longer: ${fmt.pct(fc)} read-through`,
      body: `Read-through is ${fmt.pct(fc)} against ${fmt.pct(rc)} across other topics, and ${fmt.pct(fTail)} of 14-day traffic arrives after day three (vs ${fmt.pct(rTail)}), a sign of search and referral pull beyond launch day.`,
      confidence: "Low",
      evidence: longest ? [ev(longest, "post-day-3 share", fmt.pct(tail(longest)))] : [],
    },
  ];

  const recommendations: Recommendation[] = [
    {
      id: "R1",
      title: opp ? `Build a native ${opp.channel} playbook` : "Test a third distribution channel",
      body: opp
        ? `Post every qualifying piece to ${opp.channel} with a technical framing in the first line. Current cadence is low relative to its click-through, so volume is the lever.`
        : "Pick one channel and run a four-week posting test with a fixed cadence.",
      impact: "High",
      effort: "Low",
      basis: ["F3"],
    },
    {
      id: "R2",
      title: "Turn top performers into a series",
      body: `The highest-scoring pieces (${top.map((t) => t.a.id).join(", ")}) share a format: explanatory, high read-through. Commission follow-ups and link them as a running series to compound the long tail.`,
      impact: "High",
      effort: "Medium",
      basis: ["F1", "F4"],
    },
    {
      id: "R3",
      title: "Put the subscribe moment where attention peaks",
      body: `Conversion is ${fConv >= rConv ? "already ahead" : "behind"} of the archive. Test an inline subscribe module at the 60% scroll mark on pieces with above-median read-through.`,
      impact: "Medium",
      effort: "Low",
      basis: ["F2", "F4"],
    },
  ];

  return {
    query: req.query,
    provenance,
    generatedAt: new Date().toISOString(),
    scopeLabel: label,
    focusTopic: topic,
    articleIds: focus.map((a) => a.id),
    headline: `${label[0].toUpperCase() + label.slice(1)}: ${lift >= 0 ? fmt.signedPct(lift) + " reach vs archive" : fmt.signedPct(lift) + " reach vs archive"}`,
    summary: `${defaulted ? `No topic named, so scope defaulted to ${label}. ` : ""}${focus.length} articles analysed. ${findings[0].body} ${opp ? `The clearest growth lever is ${opp.channel}.` : ""}`,
    kpis: [
      { label: "Articles in scope", value: fmt.int(focus.length), note: `of ${all.length}` },
      { label: "Avg views", value: fmt.compact(fv), delta: fmt.signedPct(lift), deltaTone: lift > 0.02 ? "up" : lift < -0.02 ? "down" : "flat" },
      { label: "Avg engaged", value: fmt.duration(fe), delta: fmt.signedPct(re ? fe / re - 1 : 0), deltaTone: fe >= re ? "up" : "down" },
      { label: "Subs / 1k views", value: fConv.toFixed(1), delta: fmt.signedPct(rConv ? fConv / rConv - 1 : 0), deltaTone: fConv >= rConv ? "up" : "down" },
    ],
    topics,
    weekly,
    channels,
    topArticles: scored.slice(0, 6).map((s) => ({ id: s.a.id, score: s.score, reason: `Leads on ${s.best}` })),
    findings,
    recommendations,
    limitations: [
      ...(defaulted ? [`The query named no topic, so scope defaulted to ${label}. Name a topic or select articles to change it.`] : []),
      "Computed from illustrative demo records, not real Pirate Wires data.",
      "Audience intelligence uses engagement proxies; no reader-level or demographic data is connected.",
      "Correlational: channel and topic effects are not causally isolated.",
    ],
  };
}
