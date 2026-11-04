export const analyticalRules = {
  minimumBaselineSample: 5,
  minimumOutlierSample: 8,
  highOutlierPercentile: 0.9,
  lowOutlierPercentile: 0.1,
  engagementRateScale: "ratio",
  nullIsNotZero: true,
} as const;

export type CatalogStatus = "specified" | "implemented";

export type MetricDefinition = {
  id: string;
  name: string;
  status: CatalogStatus;
  definition: string;
};

/**
 * Calculations the analytics phase will implement.
 * status stays "specified" until a tested function produces the number.
 * Language models must not fill these in.
 */
export const metricCatalog: readonly MetricDefinition[] = [
  {
    id: "article.total_observed_engagement",
    name: "Total observed engagement",
    status: "specified",
    definition:
      "Sum of one engagement component across like-for-like snapshots. Likes are not added to impressions, and a missing component stays null.",
  },
  {
    id: "article.engagement_rate",
    name: "Engagement rate",
    status: "specified",
    definition:
      "A stored ratio from 0 to 1 is reported only when the snapshot names its denominator. The engine does not invent a denominator from follower counts or views.",
  },
  {
    id: "article.performance_over_time",
    name: "Performance over time",
    status: "specified",
    definition:
      "Ordered snapshots for one entity and one measurement window. The series does not connect snapshots from different sources as if they were one instrument.",
  },
  {
    id: "article.cohort_performance",
    name: "Cohort performance",
    status: "specified",
    definition:
      "Articles grouped by publication period, compared on a shared age window such as the first 24 hours. Lifetime totals of unequal age are not the comparison.",
  },
  {
    id: "article.relative_to_baseline",
    name: "Performance relative to baseline",
    status: "specified",
    definition:
      "Percentile of an article inside a named comparison set. The set shares category or topic, content type when known, and an age-aligned window. Below the minimum sample, no baseline is reported.",
  },
  {
    id: "article.engagement_velocity",
    name: "Engagement velocity",
    status: "specified",
    definition:
      "Change in a cumulative component between two snapshots, divided by elapsed hours. Velocity is null when either snapshot or the publication time is missing.",
  },
  {
    id: "topic.article_count",
    name: "Articles by topic",
    status: "implemented",
    definition:
      "Count of observed articles with a confirmed topic assignment. Proposed and rejected assignments are reported separately.",
  },
  {
    id: "topic.median_engagement",
    name: "Median topic engagement",
    status: "specified",
    definition:
      "Median of an age-aligned component across confirmed articles in the topic. The mean may be shown beside it. One viral article does not set the median.",
  },
  {
    id: "topic.consistency",
    name: "Topic consistency",
    status: "specified",
    definition:
      "Spread of age-aligned performance inside a topic, reported with the sample size. A single high article is labeled as concentration, not as a property of the topic.",
  },
  {
    id: "author.publication_frequency",
    name: "Publication frequency",
    status: "specified",
    definition:
      "Observed articles per author over a named period. Authors are not ranked by frequency alone.",
  },
  {
    id: "author.median_engagement",
    name: "Median author engagement",
    status: "specified",
    definition:
      "Median age-aligned engagement of an author's observed articles, with the article count. Volume and topic mix are reported beside it.",
  },
  {
    id: "distribution.confirmed_reach",
    name: "Confirmed distribution",
    status: "specified",
    definition:
      "Posts linked to an article with confirmation_status confirmed. Inferred links are a separate series.",
  },
  {
    id: "distribution.association",
    name: "Distribution and performance association",
    status: "specified",
    definition:
      "Paired observations of distribution activity and article performance. The result is an association. It is not a causal estimate.",
  },
  {
    id: "audience.acquisition",
    name: "Traffic acquisition",
    status: "specified",
    definition:
      "First-party audience observations only. Referral, signup, and conversion counts stay null when the source did not report them.",
  },
];

export type OpportunitySignal = {
  id: string;
  status: CatalogStatus;
  claimType: "hypothesis";
  definition: string;
};

export const opportunitySignals = [
  {
    id: "opportunity.underexplored_topic",
    status: "specified",
    claimType: "hypothesis",
    definition:
      "Confirmed topic coverage is thin relative to the corpus while the age-aligned median is high. Requires the minimum baseline sample.",
  },
  {
    id: "opportunity.outperformed_baseline",
    status: "specified",
    claimType: "hypothesis",
    definition:
      "An article at or above the high-outlier percentile of its named comparison set. The comparison set and window are part of the finding.",
  },
  {
    id: "opportunity.distribution_gap",
    status: "specified",
    claimType: "hypothesis",
    definition:
      "An article with strong age-aligned performance and no confirmed social post. The gap is a candidate for an experiment, not proof that distribution was absent.",
  },
  {
    id: "opportunity.repeated_amplification",
    status: "specified",
    claimType: "hypothesis",
    definition:
      "An account with confirmed links to more than one high-performing article. A single co-occurrence is not a pattern.",
  },
  {
    id: "opportunity.content_gap",
    status: "specified",
    claimType: "hypothesis",
    definition:
      "A category or topic with coverage well below the rest of the corpus. Low coverage alone is not an opportunity unless engagement or audience evidence says the absence matters.",
  },
] as const satisfies readonly OpportunitySignal[];

export const implementedMetricIds = metricCatalog
  .filter((metric) => metric.status === "implemented")
  .map((metric) => metric.id);
