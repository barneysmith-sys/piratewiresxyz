import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sqlEnumGroups } from "../../src/domain/enums";
import { implementedMetricIds, metricCatalog, opportunitySignals } from "../../src/domain/metrics";
import {
  articleImportSchema,
  audienceObservationImportSchema,
  findingSchema,
  metricSnapshotImportSchema,
  recommendationSchema,
  researchReportSchema,
} from "../../src/domain/schemas";

const migrationsDirectory = path.join(process.cwd(), "supabase", "migrations");

describe("schema contract", () => {
  it("keeps every SQL enum value in a migration check", async () => {
    const files = (await readdir(migrationsDirectory)).filter((name) => name.endsWith(".sql"));
    const sql = (
      await Promise.all(files.map((name) => readFile(path.join(migrationsDirectory, name), "utf8")))
    ).join("\n");

    for (const [group, values] of Object.entries(sqlEnumGroups)) {
      for (const value of values) {
        expect(sql, `${group}.${value}`).toContain(`'${value}'`);
      }
    }
  });

  it("does not read browser-exposed Supabase keys", async () => {
    const source = await readFile(path.join(process.cwd(), "src/server/env.ts"), "utf8");
    expect(source).not.toContain("NEXT_PUBLIC_");
    expect(source).not.toContain("service_role");
  });
});

describe("analytical catalog", () => {
  it("does not claim that specified calculations are implemented", () => {
    expect(metricCatalog.length).toBeGreaterThan(0);
    expect(implementedMetricIds).toEqual([]);
    expect(opportunitySignals.every((signal) => signal.claimType === "hypothesis")).toBe(true);
    expect(opportunitySignals.every((signal) => signal.status === "specified")).toBe(true);
  });
});

describe("input contracts", () => {
  const sourceId = "11111111-1111-4111-8111-111111111111";
  const articleId = "22222222-2222-4222-8222-222222222222";

  it("accepts an article import and rejects a relative URL", () => {
    expect(
      articleImportSchema.parse({
        canonicalUrl: "https://www.piratewires.com/p/Example/",
        headline: "Example",
        dataSourceId: sourceId,
      }).recordStatus,
    ).toBe("observed");

    expect(
      articleImportSchema.safeParse({
        canonicalUrl: "/p/example",
        headline: "Example",
        dataSourceId: sourceId,
      }).success,
    ).toBe(false);
  });

  it("requires a real measurement and a real rate denominator", () => {
    expect(
      metricSnapshotImportSchema.safeParse({
        entityType: "article",
        entityId: articleId,
        capturedAt: "2026-11-01T00:00:00Z",
        measurementWindow: "cumulative",
        dataSourceId: sourceId,
      }).success,
    ).toBe(false);

    const missingDenominator = metricSnapshotImportSchema.safeParse({
      entityType: "article",
      entityId: articleId,
      capturedAt: "2026-11-01T00:00:00Z",
      measurementWindow: "24h",
      likes: 10,
      engagementRate: 0.2,
      dataSourceId: sourceId,
    });
    expect(missingDenominator.success).toBe(false);

    expect(
      metricSnapshotImportSchema.parse({
        entityType: "social_post",
        entityId: articleId,
        capturedAt: "2026-11-01T00:00:00Z",
        measurementWindow: "cumulative",
        likes: 4,
        engagementRate: 0.034,
        engagementRateBasis: "impressions",
        engagementRateDenominator: 1000,
        dataSourceId: sourceId,
      }).engagementRate,
    ).toBe(0.034);
  });

  it("does not accept an article audience row without an article", () => {
    expect(
      audienceObservationImportSchema.safeParse({
        measurementTimestamp: "2026-11-01T00:00:00Z",
        measurementWindow: "day",
        scope: "article",
        pageViews: 10,
        dataSourceId: sourceId,
      }).success,
    ).toBe(false);
  });

  it("rejects findings and recommendations that have no evidence", () => {
    expect(
      findingSchema.safeParse({
        statement: "This topic is working.",
        claimType: "calculated_metric",
        evidence: [],
      }).success,
    ).toBe(false);

    expect(
      recommendationSchema.safeParse({
        observation: "Publish more of this.",
        evidence: [],
        whyItMightMatter: "It might grow the audience.",
        experiment: "Publish two more essays.",
        measurementPlan: "Compare 24 hour engagement.",
        claimType: "recommendation",
      }).success,
    ).toBe(false);
  });

  it("requires a report to name its limitations", () => {
    const parsed = researchReportSchema.safeParse({
      requestId: sourceId,
      executionMode: "analytical",
      researchQuestion: "Which topics are thin?",
      researchedOn: "2026-11-03",
      methodology: "Confirmed topics, age-aligned medians.",
      datasetsExamined: ["articles"],
      keyFindings: [],
      supportingObservations: [],
      articleReferences: [],
      limitations: [],
      opportunities: [],
      recommendations: [],
    });
    expect(parsed.success).toBe(false);
  });
});
