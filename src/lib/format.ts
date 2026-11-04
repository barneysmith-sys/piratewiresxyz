const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("en-US");

export const fmt = {
  compact: (n: number) => compact.format(n),
  int: (n: number) => whole.format(Math.round(n)),
  pct: (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`,
  signedPct: (n: number, digits = 0) => `${n >= 0 ? "+" : "−"}${Math.abs(n * 100).toFixed(digits)}%`,
  duration: (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`,
  date: (iso: string) =>
    new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }),
  shortDate: (iso: string) =>
    new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "2-digit", timeZone: "UTC" }),
  path: (url: string) => url.replace(/^https?:\/\/(www\.)?/, ""),
};

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
