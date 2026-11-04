/**
 * Research protocol — the contract between the workspace UI and whatever
 * orchestrates the research (the in-browser simulator today, your agent
 * backend tomorrow). The UI renders events; it never assumes how they're made.
 */
import type { Channel, Topic } from "@/lib/data/types";

export const STAGES = [
  { id: "discovery", index: "01", title: "Content Discovery", blurb: "Find and scope the relevant articles." },
  { id: "distribution", index: "02", title: "Distribution Analysis", blurb: "Trace where the coverage travelled." },
  { id: "performance", index: "03", title: "Performance Analysis", blurb: "Measure reach, attention and conversion." },
  { id: "audience", index: "04", title: "Audience Intelligence", blurb: "Who engages, and how deeply." },
  { id: "synthesis", index: "05", title: "Strategic Synthesis", blurb: "Findings and growth recommendations." },
] as const;

export type StageId = (typeof STAGES)[number]["id"];
export type StageStatus = "queued" | "running" | "complete" | "skipped" | "error";

export interface ResearchRequest {
  query: string;
  /** optional explicit scope from the database selection */
  articleIds?: string[];
  /** demo reads the labelled illustrative corpus. analytical never does. */
  mode?: "demo" | "analytical";
}

export type ResearchEvent =
  | { type: "stage"; stage: StageId; status: StageStatus; summary?: string }
  | { type: "step"; stage: StageId; id: string; label: string; detail?: string; status: "running" | "done" }
  | { type: "report"; report: ResearchReport }
  | { type: "error"; message: string }
  | { type: "done" };

export interface Evidence {
  articleId: string;
  /** which metric supports the claim, e.g. "views", "Hacker News CTR" */
  metric: string;
  value: string;
}

export interface Finding {
  id: string;
  stage: StageId;
  title: string;
  body: string;
  confidence: "High" | "Medium" | "Low";
  evidence: Evidence[];
}

export interface Recommendation {
  id: string;
  title: string;
  body: string;
  impact: "High" | "Medium" | "Low";
  effort: "Low" | "Medium" | "High";
  basis: string[]; // finding ids
}

export interface TopicRow {
  topic: Topic;
  articles: number;
  avgViews: number;
  avgEngagedSec: number;
  completion: number;
  subsPer1k: number;
}

export interface ChannelRow {
  channel: Channel;
  focusImpressions: number;
  baseImpressions: number;
  focusCtr: number;
  baseCtr: number;
  focusPosts: number;
}

export interface ResearchReport {
  query: string;
  /** "simulated" reports are computed from demo data by the in-browser engine. */
  provenance: "simulated" | "live";
  generatedAt: string;
  scopeLabel: string;
  focusTopic: Topic | null;
  articleIds: string[];
  headline: string;
  summary: string;
  kpis: { label: string; value: string; delta?: string; deltaTone?: "up" | "down" | "flat"; note?: string }[];
  topics: TopicRow[];
  weekly: { week: string; focus: number; rest: number }[];
  channels: ChannelRow[];
  topArticles: { id: string; score: number; reason: string }[];
  findings: Finding[];
  recommendations: Recommendation[];
  limitations: string[];
}

export interface ResearchEngine {
  readonly mode: "simulated" | "live";
  run(req: ResearchRequest, opts: { signal: AbortSignal; onEvent: (e: ResearchEvent) => void }): Promise<void>;
}
