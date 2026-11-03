import { z } from "zod";
import {
  audienceScopes,
  audienceWindows,
  claimTypes,
  contentTypes,
  dataQualities,
  executionModes,
  measurementWindows,
  metricEntityTypes,
  rateBases,
  recordStatuses,
  researchIntents,
} from "./enums";
import { normalizeUrl } from "./url";

const timestampSchema = z.iso.datetime({ offset: true });

export const canonicalUrlSchema = z.string().trim().min(1).refine(
  (value) => {
    try {
      normalizeUrl(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: "An absolute http(s) URL is required." },
);

export const evidenceSchema = z.object({
  description: z.string().trim().min(1),
  articleId: z.uuid().optional(),
  sourceId: z.uuid().optional(),
  metric: z.string().trim().min(1).optional(),
  value: z.union([z.number(), z.string(), z.null()]).optional(),
});

export const findingSchema = z.object({
  statement: z.string().trim().min(1),
  claimType: z.enum(claimTypes),
  evidence: z.array(evidenceSchema).min(1),
});

export const recommendationSchema = z.object({
  observation: z.string().trim().min(1),
  evidence: z.array(evidenceSchema).min(1),
  whyItMightMatter: z.string().trim().min(1),
  experiment: z.string().trim().min(1),
  measurementPlan: z.string().trim().min(1),
  claimType: z.enum(["hypothesis", "recommendation"]),
});

export const researchReportSchema = z.object({
  requestId: z.uuid(),
  executionMode: z.enum(["analytical", "simulated"]),
  researchQuestion: z.string().trim().min(1),
  researchedOn: z.iso.date(),
  methodology: z.string().trim().min(1),
  datasetsExamined: z.array(z.string().trim().min(1)).min(1),
  keyFindings: z.array(findingSchema),
  supportingObservations: z.array(evidenceSchema),
  articleReferences: z.array(z.uuid()),
  visualizationSpecs: z.array(z.record(z.string(), z.unknown())).default([]),
  limitations: z.array(z.string().trim().min(1)).min(1),
  opportunities: z.array(findingSchema),
  recommendations: z.array(recommendationSchema),
});

export const researchRequestSchema = z.object({
  query: z.string().trim().min(1).max(4_000),
  intent: z.enum(researchIntents).optional(),
  executionMode: z.enum(executionModes).default("analytical"),
});

export const articleImportSchema = z.object({
  canonicalUrl: canonicalUrlSchema,
  headline: z.string().trim().min(1),
  subheadline: z.string().trim().min(1).nullable().optional(),
  publicationTimestamp: timestampSchema.nullable().optional(),
  contentType: z.enum(contentTypes).nullable().optional(),
  excerpt: z.string().nullable().optional(),
  bodyText: z.string().nullable().optional(),
  wordCount: z.number().int().nonnegative().nullable().optional(),
  recordStatus: z.enum(recordStatuses).default("observed"),
  dataSourceId: z.uuid(),
  collectedAt: timestampSchema.optional(),
});

const optionalCount = z.number().int().nonnegative().nullable().optional();

export const metricSnapshotImportSchema = z
  .object({
    entityType: z.enum(metricEntityTypes),
    entityId: z.uuid(),
    capturedAt: timestampSchema,
    collectedAt: timestampSchema.optional(),
    measurementWindow: z.enum(measurementWindows),
    windowStart: timestampSchema.nullable().optional(),
    windowEnd: timestampSchema.nullable().optional(),
    impressions: optionalCount,
    views: optionalCount,
    likes: optionalCount,
    reposts: optionalCount,
    replies: optionalCount,
    clicks: optionalCount,
    bookmarks: optionalCount,
    engagementRate: z.number().min(0).max(1).nullable().optional(),
    engagementRateBasis: z.enum(rateBases).nullable().optional(),
    engagementRateBasisNote: z.string().trim().min(1).nullable().optional(),
    engagementRateDenominator: z.number().positive().nullable().optional(),
    dataQuality: z.enum(dataQualities).default("observed"),
    dataSourceId: z.uuid(),
    rawObservation: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .superRefine((value, context) => {
    const measurements = [
      value.impressions,
      value.views,
      value.likes,
      value.reposts,
      value.replies,
      value.clicks,
      value.bookmarks,
      value.engagementRate,
    ];
    if (measurements.every((item) => item === undefined || item === null)) {
      context.addIssue({
        code: "custom",
        message: "At least one measurement is required.",
        path: ["impressions"],
      });
    }

    if (value.engagementRate !== undefined && value.engagementRate !== null) {
      if (!value.engagementRateBasis) {
        context.addIssue({
          code: "custom",
          message: "An engagement rate requires a denominator basis.",
          path: ["engagementRateBasis"],
        });
      }
      if (value.engagementRateDenominator === undefined || value.engagementRateDenominator === null) {
        context.addIssue({
          code: "custom",
          message: "An engagement rate requires a positive denominator.",
          path: ["engagementRateDenominator"],
        });
      }
      if (value.engagementRateBasis === "other" && !value.engagementRateBasisNote) {
        context.addIssue({
          code: "custom",
          message: 'Basis "other" requires a note that names the denominator.',
          path: ["engagementRateBasisNote"],
        });
      }
    }

    if (value.measurementWindow === "custom" && (!value.windowStart || !value.windowEnd)) {
      context.addIssue({
        code: "custom",
        message: "A custom window requires a start and an end.",
        path: ["windowStart"],
      });
    }
  });

export const audienceObservationImportSchema = z
  .object({
    measurementTimestamp: timestampSchema,
    measurementWindow: z.enum(audienceWindows),
    scope: z.enum(audienceScopes),
    articleId: z.uuid().nullable().optional(),
    referralSource: z.string().trim().min(1).nullable().optional(),
    retentionCohort: z.string().trim().min(1).nullable().optional(),
    uniqueVisitors: optionalCount,
    pageViews: optionalCount,
    newsletterSignups: optionalCount,
    subscriberConversions: optionalCount,
    returningVisitors: optionalCount,
    subscriptionEventCount: optionalCount,
    dataQuality: z.enum(dataQualities).default("observed"),
    dataSourceId: z.uuid(),
  })
  .superRefine((value, context) => {
    const measurements = [
      value.uniqueVisitors,
      value.pageViews,
      value.newsletterSignups,
      value.subscriberConversions,
      value.returningVisitors,
      value.subscriptionEventCount,
    ];
    if (measurements.every((item) => item === undefined || item === null)) {
      context.addIssue({
        code: "custom",
        message: "At least one audience measurement is required.",
        path: ["uniqueVisitors"],
      });
    }
    if (value.scope === "article" && !value.articleId) {
      context.addIssue({
        code: "custom",
        message: "An article-scoped audience row requires an article.",
        path: ["articleId"],
      });
    }
    if (value.scope === "referral" && !value.referralSource) {
      context.addIssue({
        code: "custom",
        message: "A referral-scoped audience row requires a referral source.",
        path: ["referralSource"],
      });
    }
    if (value.scope === "cohort" && !value.retentionCohort) {
      context.addIssue({
        code: "custom",
        message: "A cohort-scoped audience row requires a cohort label.",
        path: ["retentionCohort"],
      });
    }
  });

export type Evidence = z.infer<typeof evidenceSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export type ResearchReport = z.infer<typeof researchReportSchema>;
export type ResearchRequestInput = z.infer<typeof researchRequestSchema>;
export type ArticleImport = z.infer<typeof articleImportSchema>;
export type MetricSnapshotImport = z.infer<typeof metricSnapshotImportSchema>;
export type AudienceObservationImport = z.infer<typeof audienceObservationImportSchema>;
