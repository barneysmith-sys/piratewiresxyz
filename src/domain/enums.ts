export const collectionMethods = [
  "manual_entry",
  "csv_upload",
  "json_import",
  "website_export",
  "platform_api",
  "public_page",
  "illustrative_fixture",
  "other",
] as const;

export const validationStatuses = [
  "unverified",
  "validated",
  "rejected",
  "illustrative",
] as const;

export const contentTypes = [
  "essay",
  "news",
  "interview",
  "brief",
  "newsletter",
  "announcement",
  "video",
  "audio",
  "other",
] as const;

export const recordStatuses = ["observed", "illustrative"] as const;

export const authorRoles = ["primary", "author", "contributor"] as const;

export const classificationSources = ["manual", "model", "import", "rule"] as const;

export const topicConfirmations = ["proposed", "confirmed", "rejected"] as const;

export const platforms = [
  "x",
  "instagram",
  "threads",
  "youtube",
  "tiktok",
  "newsletter",
  "website",
  "other",
] as const;

export const identifierKinds = ["platform_id", "handle"] as const;

export const dataQualities = [
  "observed",
  "estimated",
  "illustrative",
  "incomplete",
  "unknown",
] as const;

export const relationshipTypes = [
  "official_distribution",
  "amplification",
  "mention",
  "quote",
  "reply",
  "unknown",
] as const;

export const relationshipConfirmations = [
  "confirmed",
  "inferred",
  "rejected",
  "pending",
] as const;

export const metricEntityTypes = [
  "article",
  "social_post",
  "distribution_account",
] as const;

export const measurementWindows = [
  "cumulative",
  "1h",
  "24h",
  "7d",
  "30d",
  "calendar_day",
  "custom",
] as const;

export const rateBases = ["impressions", "views", "followers", "other"] as const;

export const audienceWindows = [
  "hour",
  "day",
  "week",
  "trailing_7d",
  "trailing_30d",
  "custom",
] as const;

export const audienceScopes = ["site", "article", "referral", "cohort"] as const;

export const ingestionAdapters = [
  "csv",
  "json",
  "article_metadata",
  "manual_article",
  "social_post",
  "metric_snapshot",
] as const;

export const ingestionStatuses = [
  "pending",
  "running",
  "completed",
  "completed_with_errors",
  "failed",
] as const;

export const researchIntents = [
  "article_search",
  "topic_comparison",
  "author_comparison",
  "distribution_analysis",
  "historical_performance",
  "growth_opportunities",
  "general_research",
] as const;

export const researchStatuses = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export const executionModes = ["analytical", "simulated"] as const;

export const researchStages = [
  "content_discovery",
  "distribution_research",
  "performance_analysis",
  "audience_analysis",
  "strategic_synthesis",
] as const;

export const taskStatuses = [
  "queued",
  "running",
  "completed",
  "skipped",
  "failed",
] as const;

export const claimTypes = [
  "observed_fact",
  "calculated_metric",
  "estimate",
  "inference",
  "hypothesis",
  "recommendation",
] as const;

export const datasets = [
  "articles",
  "authors",
  "topics",
  "social_posts",
  "distribution_accounts",
  "metric_snapshots",
  "audience_observations",
] as const;

/** Values stored in check constraints. Claim types are an application contract. */
export const sqlEnumGroups = {
  collectionMethods,
  validationStatuses,
  contentTypes,
  recordStatuses,
  authorRoles,
  classificationSources,
  topicConfirmations,
  platforms,
  identifierKinds,
  dataQualities,
  relationshipTypes,
  relationshipConfirmations,
  metricEntityTypes,
  measurementWindows,
  rateBases,
  audienceWindows,
  audienceScopes,
  ingestionAdapters,
  ingestionStatuses,
  researchIntents,
  researchStatuses,
  executionModes,
  researchStages,
  taskStatuses,
} as const;
