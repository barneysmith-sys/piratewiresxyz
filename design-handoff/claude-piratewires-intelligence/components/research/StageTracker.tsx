"use client";

/** The five research processes with live status, progress and expandable step logs. */
import { Check, ChevronDown, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { cx } from "@/lib/format";
import { STAGES, type StageId } from "@/lib/research/types";
import type { StageState } from "./useResearchRun";

function StatusGlyph({ status }: { status: StageState["status"] }) {
  if (status === "complete")
    return (
      <span className="grid h-5 w-5 place-items-center bg-paper text-black">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  if (status === "running")
    return (
      <span className="grid h-5 w-5 place-items-center border border-signal">
        <span className="h-2 w-2 animate-pulse-dot bg-signal" />
      </span>
    );
  if (status === "error") return <span className="grid h-5 w-5 place-items-center border border-signal text-signal">!</span>;
  return <span className="h-5 w-5 border border-line-strong" />;
}

export default function StageTracker({ stages, progress }: { stages: Record<StageId, StageState>; progress: number }) {
  const [open, setOpen] = useState<StageId | null>(null);
  const running = STAGES.find((s) => stages[s.id].status === "running")?.id ?? null;

  // follow the active stage while running; user expansion takes over after
  useEffect(() => {
    if (running) setOpen(running);
  }, [running]);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="pw-label">Research execution</p>
        <p className="font-mono text-[11px] text-paper tabular">{Math.round(progress * 100)}%</p>
      </div>
      <div className="mt-3 h-px bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Research progress">
        <div className="h-px bg-signal transition-[width] duration-700 ease-out" style={{ width: `${progress * 100}%` }} />
      </div>

      <ol className="mt-4">
        {STAGES.map((s, i) => {
          const st = stages[s.id];
          const isOpen = open === s.id;
          const elapsed = st.startedAt && st.endedAt ? ((st.endedAt - st.startedAt) / 1000).toFixed(1) + "s" : null;
          return (
            <li key={s.id} className={cx("relative border-b border-line-faint", st.status === "queued" && "opacity-55")}>
              {/* connector */}
              {i < STAGES.length - 1 && <span aria-hidden className={cx("absolute left-[9.5px] top-[38px] h-[calc(100%-26px)] w-px", st.status === "complete" ? "bg-paper/50" : "bg-line")} />}
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : s.id)}
                disabled={st.status === "queued"}
                className="flex w-full items-start gap-4 py-3.5 text-left"
              >
                <span className="relative z-[1] mt-[1px] bg-black">
                  <StatusGlyph status={st.status} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-2xs text-mute">{s.index}</span>
                    <span className={cx("font-display text-[19px] font-semibold uppercase leading-none tracking-[0.01em]", st.status === "running" ? "text-paper" : "text-paper/90")}>
                      {s.title}
                    </span>
                  </span>
                  <span className="mt-1.5 block font-mono text-[11.5px] text-mute">
                    {st.status === "queued" && "Queued"}
                    {st.status === "running" && <span className="text-[#FF8A8D]">Running · {st.steps.filter((x) => x.status === "done").length}/3 steps</span>}
                    {st.status === "complete" && (
                      <>
                        {st.summary}
                        {elapsed && <span className="text-mute-deep"> · {elapsed}</span>}
                      </>
                    )}
                    {st.status === "error" && "Failed"}
                  </span>
                </span>
                {st.status !== "queued" && <ChevronDown aria-hidden className={cx("mt-1 h-4 w-4 text-mute transition-transform", isOpen && "rotate-180")} />}
              </button>
              <div className={cx("grid transition-[grid-template-rows] duration-300 ease-out", isOpen && st.steps.length ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <div className="overflow-hidden">
                  <ul className="mb-4 ml-9 space-y-2 border-l border-line pl-4">
                    {st.steps.map((step) => (
                      <li key={step.id} className="animate-rise font-mono text-[11.5px] leading-relaxed">
                        <span className="flex items-center gap-2 text-paper/90">
                          {step.status === "running" ? <Loader className="h-3 w-3 animate-spin text-signal" /> : <span className="h-1 w-1 bg-paper/60" />}
                          {step.label}
                        </span>
                        {step.detail && <span className="ml-5 block text-mute">→ {step.detail}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
