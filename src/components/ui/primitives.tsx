import { cx } from "@/lib/format";

/** Always-visible honesty marker for illustrative data / simulated runs. */
export function DemoBadge({ children = "Demo data", className }: { children?: React.ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 border border-signal/40 bg-signal/[0.07] px-2 py-[3px] font-mono text-2xs uppercase text-[#FF8A8D]",
        className
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 bg-signal" />
      {children}
    </span>
  );
}

export function SectionLabel({ index, children, className }: { index?: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cx("pw-label flex items-center gap-3", className)}>
      {index && <span className="text-signal">{index}</span>}
      <span>{children}</span>
    </p>
  );
}

export function Metric({
  label,
  value,
  sub,
  tone = "base",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "base" | "focus";
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <span className="pw-label">{label}</span>
      <span className={cx("font-display text-[34px] font-semibold leading-none tabular md:text-[40px]", tone === "focus" ? "text-signal" : "text-paper")}>
        {value}
      </span>
      {sub && <span className="font-mono text-[11.5px] text-mute">{sub}</span>}
    </div>
  );
}

/** 14-point sparkline, plain SVG (cheap enough to render in every table row). */
export function Sparkline({
  values,
  width = 88,
  height = 24,
  focus = false,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  focus?: boolean;
  className?: string;
}) {
  if (values.length < 2) return <span className="font-mono text-[11px] text-mute">—</span>;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 2 - (v / max) * (height - 4)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label="14-day views trend">
      <path d={`${d}L${width},${height}L0,${height}Z`} fill={focus ? "rgba(227,38,43,0.14)" : "rgba(237,235,230,0.07)"} />
      <path d={d} fill="none" stroke={focus ? "#E3262B" : "#EDEBE6"} strokeWidth="1.2" strokeLinejoin="round" />
      <rect x={pts[0][0]} y={pts[0][1] - 1.5} width="3" height="3" fill={focus ? "#E3262B" : "#EDEBE6"} />
    </svg>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="border border-line-strong px-1.5 py-[1px] font-mono text-2xs text-paper/80">{children}</kbd>;
}
