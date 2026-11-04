"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getResearchEngine } from "@/lib/research/engine";
import { STAGES, type ResearchEvent, type ResearchReport, type ResearchRequest, type StageId, type StageStatus } from "@/lib/research/types";

export interface StepState {
  id: string;
  label: string;
  detail?: string;
  status: "running" | "done";
}
export interface StageState {
  id: StageId;
  status: StageStatus;
  summary?: string;
  steps: StepState[];
  startedAt?: number;
  endedAt?: number;
}

const initial = (): Record<StageId, StageState> =>
  Object.fromEntries(STAGES.map((s) => [s.id, { id: s.id, status: "queued", steps: [] }])) as unknown as Record<StageId, StageState>;

/** Drives a research run and reduces engine events into UI state. */
export function useResearchRun(req: ResearchRequest | null) {
  const [stages, setStages] = useState(initial);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const engineRef = useRef(getResearchEngine());
  const [runKey, setRunKey] = useState(0);

  const onEvent = useCallback((e: ResearchEvent) => {
    switch (e.type) {
      case "stage":
        setStages((s) => ({
          ...s,
          [e.stage]: {
            ...s[e.stage],
            status: e.status,
            summary: e.summary ?? s[e.stage].summary,
            startedAt: e.status === "running" ? Date.now() : s[e.stage].startedAt,
            endedAt: e.status === "complete" || e.status === "skipped" ? Date.now() : s[e.stage].endedAt,
          },
        }));
        break;
      case "step":
        setStages((s) => {
          const st = s[e.stage];
          const exists = st.steps.some((x) => x.id === e.id);
          const steps = exists ? st.steps.map((x) => (x.id === e.id ? { ...x, ...e } : x)) : [...st.steps, { id: e.id, label: e.label, detail: e.detail, status: e.status }];
          return { ...s, [e.stage]: { ...st, steps } };
        });
        break;
      case "report":
        setReport(e.report);
        break;
      case "error":
        setError(e.message);
        setStatus("error");
        break;
      case "done":
        setStatus("done");
        break;
    }
  }, []);

  useEffect(() => {
    if (!req) return;
    const ctrl = new AbortController();
    setStages(initial());
    setReport(null);
    setError(null);
    setStatus("running");
    engineRef.current.run(req, { signal: ctrl.signal, onEvent }).catch((err: unknown) => {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
      setStatus("error");
    });
    return () => ctrl.abort();
  }, [req, onEvent, runKey]);

  const retry = useCallback(() => setRunKey((k) => k + 1), []);
  const completed = STAGES.filter((s) => stages[s.id].status === "complete" || stages[s.id].status === "skipped").length;

  return { stages, report, error, status, retry, progress: completed / STAGES.length, mode: engineRef.current.mode };
}
