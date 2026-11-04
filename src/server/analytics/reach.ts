import { analyticalRules } from "@/domain/metrics";

/** Median of a numeric sample. Empty input is unknown, not zero. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const left = sorted[mid - 1];
    const right = sorted[mid];
    if (left === undefined || right === undefined) return null;
    return (left + right) / 2;
  }
  return sorted[mid] ?? null;
}

export type ReachSummary = {
  measured: number;
  missing: number;
  median: number | null;
  /** Why this must not be presented as the catalog baseline. */
  withheld: "none" | "insufficient_sample" | "not_age_aligned";
};

/**
 * Describes stored view totals. A baseline is withheld below the sample
 * minimum, and lifetime totals of unequal age are never called age-aligned.
 */
export function describeReach(views: readonly (number | null)[]): ReachSummary {
  const measured = views.filter((value): value is number => value != null);
  const missing = views.length - measured.length;
  if (measured.length === 0) {
    return { measured: 0, missing, median: null, withheld: "none" };
  }
  const value = median(measured);
  if (measured.length < analyticalRules.minimumBaselineSample) {
    return { measured: measured.length, missing, median: value, withheld: "insufficient_sample" };
  }
  return { measured: measured.length, missing, median: value, withheld: "not_age_aligned" };
}
