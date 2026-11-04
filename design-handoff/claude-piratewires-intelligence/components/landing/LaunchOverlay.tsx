"use client";

/**
 * Search → workspace transition. A red scan line opens from the search bar,
 * the frame falls to black and the query is handed to the planner.
 * The research page fades in from the same black, so the cut is invisible.
 */
import { cx } from "@/lib/format";
import { STAGES } from "@/lib/research/types";

export default function LaunchOverlay({ query }: { query: string | null }) {
  const on = !!query;
  return (
    <div aria-hidden={!on} className={cx("fixed inset-0 z-[60]", on ? "pointer-events-auto" : "pointer-events-none")}>
      {/* two shutters closing on the search line */}
      <div className={cx("absolute inset-x-0 top-0 h-1/2 origin-top bg-black transition-transform duration-[650ms] ease-in-out-quart", on ? "scale-y-100" : "scale-y-0")} />
      <div className={cx("absolute inset-x-0 bottom-0 h-1/2 origin-bottom bg-black transition-transform duration-[650ms] ease-in-out-quart", on ? "scale-y-100" : "scale-y-0")} />
      <div
        className={cx(
          "absolute left-1/2 top-1/2 h-px -translate-x-1/2 bg-signal shadow-[0_0_24px_rgba(227,38,43,0.8)] transition-[width,opacity] duration-700 ease-out",
          on ? "w-full opacity-100" : "w-0 opacity-0"
        )}
      />
      {on && (
        <div className="absolute inset-x-0 top-1/2 mt-6 flex flex-col items-center gap-3 px-6 text-center" role="status">
          <p className="animate-rise font-mono text-[13px] text-paper [animation-delay:250ms]">
            <span className="text-signal">›</span> {query}
          </p>
          <p className="animate-rise font-mono text-2xs uppercase text-mute [animation-delay:400ms]">
            Planning {STAGES.length} research stages
          </p>
        </div>
      )}
    </div>
  );
}
