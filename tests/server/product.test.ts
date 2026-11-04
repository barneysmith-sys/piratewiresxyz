import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { median, describeReach } from "../../src/server/analytics/reach";
import { confirmedTopicCounts } from "../../src/server/analytics/topics";
import { listArticles } from "../../src/server/articles/query";
import { seedIllustrativeCorpus } from "../../src/server/demo/seed";
import { applyMigrations, type SqlSession } from "../../src/server/db/migrate";
import { resolveSandboxDirectory } from "../../src/server/db/session";
import { executeResearch } from "../../src/server/research/execute";

let db: PGlite;

function session(database: PGlite): SqlSession {
  return {
    exec: async (sql: string) => {
      await database.exec(sql);
    },
    query: async <T extends Record<string, unknown>>(sql: string, params?: unknown[]) => {
      const result = await database.query<T>(sql, params);
      return result.rows;
    },
  };
}

describe("sandbox location", () => {
  it("uses local disk in development and /tmp on Vercel", () => {
    expect(resolveSandboxDirectory({})).toBe(path.join(process.cwd(), "data", "sandbox"));
    expect(resolveSandboxDirectory({ VERCEL: "1" })).toBe("/tmp/pw-intelligence-sandbox");
  });
});

describe("reach calculations", () => {
  it("returns the middle value and withholds a baseline below the sample minimum", () => {
    expect(median([10, 40, 20])).toBe(20);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
    expect(describeReach([10, 40, null, 20]).withheld).toBe("insufficient_sample");
    expect(describeReach([10, 40, null, 20]).median).toBe(20);
    const enough = describeReach([5, 4, 3, 2, 1]);
    expect(enough.median).toBe(3);
    expect(enough.withheld).toBe("not_age_aligned");
    expect(describeReach([null, null])).toEqual({ measured: 0, missing: 2, median: null, withheld: "none" });
  });
});

describe("illustrative corpus isolation", () => {
  beforeAll(async () => {
    db = new PGlite();
    await applyMigrations(session(db));
    const seeded = await seedIllustrativeCorpus(session(db));
    expect(seeded.seeded).toBe(true);
    expect(seeded.articles).toBeGreaterThan(20);
  }, 60_000);

  afterAll(async () => {
    await db.close();
  });

  it("serves the fixture to demo mode and hides it from analytical mode", async () => {
    const demo = await listArticles(session(db), { mode: "demo", limit: 100 });
    const analytical = await listArticles(session(db), { mode: "analytical", limit: 100 });
    expect(demo.illustrative).toBe(true);
    expect(demo.articles.length).toBeGreaterThan(20);
    expect(demo.articles.every((article) => article.demo)).toBe(true);
    expect(demo.articles[0]?.sourceName).toContain("Illustrative");
    expect(analytical.observed).toEqual([]);
    expect(analytical.articles).toEqual([]);
    expect(analytical.emptyReason).toMatch(/illustrative/i);

    const leaked = await db.query<{ n: number }>(
      "select count(*)::int as n from public.analytical_articles",
    );
    expect(leaked.rows[0]?.n).toBe(0);
    const snapshots = await db.query<{ n: number }>(
      "select count(*)::int as n from public.analytical_metric_snapshots",
    );
    expect(snapshots.rows[0]?.n).toBe(0);
    expect(await confirmedTopicCounts(session(db))).toEqual([]);
  });

  it("counts a confirmed observed topic and still excludes the fixture", async () => {
    const source = await db.query<{ id: string }>(
      `insert into public.data_sources (source_key, name, collection_method, permissions, validation_status)
       values ('observed-test', 'Test export', 'manual_entry', 'unit test', 'validated')
       returning id::text as id`,
    );
    const sourceId = source.rows[0]?.id;
    const article = await db.query<{ id: string }>(
      `select id::text as id from internal.import_article(
         'https://example.com/observed-article', 'An observed article', $1::uuid,
         null, '2026-01-01T00:00:00Z', null, 'essay', null, null, null, null, 'observed', now()
       )`,
      [sourceId],
    );
    const topic = await db.query<{ id: string }>(
      `select id::text as id from public.topics where topic_name = 'AI'`,
    );
    await db.query(
      `insert into public.article_topics (
         article_id, topic_id, classification_source, confirmation_status, data_source_id, confirmed_at
       ) values ($1::uuid, $2::uuid, 'manual', 'confirmed', $3::uuid, now())`,
      [article.rows[0]?.id, topic.rows[0]?.id, sourceId],
    );

    expect(await confirmedTopicCounts(session(db))).toEqual([{ topic: "AI", articles: 1 }]);
    const analytical = await listArticles(session(db), { mode: "analytical", limit: 100 });
    expect(analytical.observed.map((record) => record.headline)).toEqual(["An observed article"]);
    expect(analytical.observed[0]?.views).toBeNull();
    const demo = await listArticles(session(db), { mode: "demo", q: "observed article" });
    expect(demo.articles).toEqual([]);
  });

  it("persists a simulated demo run and an analytical run that skips audience", async () => {
    const demo = await executeResearch(session(db), {
      query: "Analyze AI coverage performance",
      mode: "demo",
    });
    expect(demo.report.provenance).toBe("simulated");
    expect(demo.report.findings.length).toBeGreaterThan(0);
    expect(demo.report.recommendations.length).toBeGreaterThan(0);
    expect(demo.report.limitations.some((line) => /illustrative/i.test(line))).toBe(true);
    expect(demo.report.articleIds.length).toBeGreaterThan(0);

    const stored = await db.query<{ execution_mode: string }>(
      `select execution_mode from public.research_reports where request_id = $1::uuid`,
      [demo.requestId],
    );
    expect(stored.rows[0]?.execution_mode).toBe("simulated");

    const analytical = await executeResearch(session(db), {
      query: "Analyze AI coverage performance",
      mode: "analytical",
    });
    expect(analytical.report.provenance).toBe("live");
    expect(analytical.report.recommendations).toEqual([]);
    expect(analytical.report.kpis.some((kpi) => kpi.value === "—" || kpi.note === "withheld" || kpi.label === "Observed articles")).toBe(true);

    const audience = await db.query<{ status: string }>(
      `select status from public.research_tasks where request_id = $1::uuid and stage = 'audience_analysis'`,
      [analytical.requestId],
    );
    expect(audience.rows[0]?.status).toBe("skipped");
  });
});
