/**
 * Research engines.
 *
 *  - SimulatedEngine: runs in the browser, paces the five stages with timers
 *    and computes its report from the demo dataset. Every surface that shows
 *    its output is labelled "Simulated run".
 *  - HttpEngine: POSTs the request to your orchestrator and consumes a
 *    Server-Sent-Events stream of `ResearchEvent` JSON objects.
 *
 * Set NEXT_PUBLIC_RESEARCH_ENDPOINT to switch to the live engine.
 */
import { getArticles } from "@/lib/data/articles";
import { fmt } from "@/lib/format";
import { buildReport, channelTable, resolveScope, scoreArticles } from "./analyze";
import type { ResearchEngine, ResearchEvent, ResearchRequest, StageId } from "./types";

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("aborted", "AbortError"));
    });
  });

export class SimulatedEngine implements ResearchEngine {
  readonly mode = "simulated" as const;
  constructor(private pace = 1) {}

  async run(req: ResearchRequest, { signal, onEvent }: { signal: AbortSignal; onEvent: (e: ResearchEvent) => void }) {
    const all = getArticles();
    const { focus, rest, label } = resolveScope(req, all);
    const report = buildReport(req, all, "simulated");
    const ch = channelTable(focus, rest);
    const scored = scoreArticles(focus);
    const dates = focus.map((a) => a.publishedAt).sort();
    const authors = new Set(focus.map((a) => a.author));
    const p = this.pace;

    const stage = async (id: StageId, steps: [string, string][], summary: string) => {
      onEvent({ type: "stage", stage: id, status: "running" });
      for (let i = 0; i < steps.length; i++) {
        const sid = `${id}-${i}`;
        onEvent({ type: "step", stage: id, id: sid, label: steps[i][0], status: "running" });
        await sleep((380 + Math.random() * 420) * p, signal);
        onEvent({ type: "step", stage: id, id: sid, label: steps[i][0], detail: steps[i][1], status: "done" });
      }
      onEvent({ type: "stage", stage: id, status: "complete", summary });
      await sleep(160 * p, signal);
    };

    await sleep(350 * p, signal);
    await stage(
      "discovery",
      [
        ["Parse research intent", `scope → ${label}`],
        ["Query article index", `${focus.length} matches of ${all.length} records`],
        ["Resolve authors and dates", `${authors.size} authors · ${fmt.shortDate(dates[0])} – ${fmt.shortDate(dates[dates.length - 1])}`],
      ],
      `${focus.length} articles · ${authors.size} authors`
    );
    await stage(
      "distribution",
      [
        ["Join social distribution records", `${focus.reduce((s, a) => s + a.distribution.length, 0)} channel placements`],
        ["Aggregate impressions by channel", `${ch[0].channel} leads with ${fmt.compact(ch[0].focusImpressions)} impressions`],
        ["Compare click-through vs other topics", `${ch.filter((c) => c.focusCtr > c.baseCtr).length} of ${ch.length} channels above baseline`],
      ],
      `${ch.length} channels mapped`
    );
    await stage(
      "performance",
      [
        ["Compute reach, attention, conversion", `${report.kpis[1].value} avg views (${report.kpis[1].delta})`],
        ["Score articles (reach × attention × conversion)", `top score ${scored[0]?.score ?? 0} · ${scored[0]?.a.id ?? "—"}`],
        ["Benchmark against archive by topic", `${report.topics.length} topics compared`],
      ],
      `${report.kpis[1].delta} reach vs archive`
    );
    await stage(
      "audience",
      [
        ["Read-through and engaged-time distribution", `${report.kpis[2].value} avg engaged`],
        ["Long-tail traffic decay", "14-day curves fitted"],
        ["Check reader-level sources", "none connected · using engagement proxies"],
      ],
      "Proxies only · no reader-level data"
    );
    await stage(
      "synthesis",
      [
        ["Draft findings with evidence links", `${report.findings.length} findings`],
        ["Rank growth recommendations", `${report.recommendations.length} recommendations`],
        ["State limitations", `${report.limitations.length} caveats`],
      ],
      `${report.findings.length} findings · ${report.recommendations.length} actions`
    );

    onEvent({ type: "report", report });
    onEvent({ type: "done" });
  }
}

export class HttpEngine implements ResearchEngine {
  readonly mode = "live" as const;
  constructor(private endpoint: string) {}

  async run(req: ResearchRequest, { signal, onEvent }: { signal: AbortSignal; onEvent: (e: ResearchEvent) => void }) {
    let res: Response;
    try {
      res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(req),
        signal,
      });
    } catch (error) {
      if (signal.aborted || req.mode === "analytical") throw error;
      await new SimulatedEngine().run(req, { signal, onEvent });
      return;
    }
    if (!res.ok || !res.body) {
      if (req.mode !== "analytical") {
        await new SimulatedEngine().run(req, { signal, onEvent });
        return;
      }
      throw new Error(`Research endpoint returned ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const data = chunk
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim())
          .join("\n");
        if (data) onEvent(JSON.parse(data) as ResearchEvent);
      }
    }
  }
}

export function getResearchEngine(): ResearchEngine {
  return new HttpEngine(process.env.NEXT_PUBLIC_RESEARCH_ENDPOINT || "/api/research/stream");
}
