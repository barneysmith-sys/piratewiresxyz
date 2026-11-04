import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applyMigrations, type SqlSession } from "../../src/server/db/migrate";
import { invalidUrls, urlFixtures } from "../fixtures/urls";

const tables = [
  "data_sources",
  "categories",
  "authors",
  "articles",
  "article_authors",
  "topics",
  "article_topics",
  "tags",
  "article_tags",
  "distribution_accounts",
  "account_observations",
  "social_posts",
  "article_social_posts",
  "metric_snapshots",
  "audience_observations",
  "ingestion_batches",
  "ingestion_rejections",
  "research_requests",
  "research_tasks",
  "research_reports",
];

let db: PGlite;

function session(database: PGlite): SqlSession {
  return {
    exec: async (sql) => {
      await database.exec(sql);
    },
    query: async <T extends Record<string, unknown>>(sql: string, params?: unknown[]) => {
      const result = await database.query<T>(sql, params);
      return result.rows;
    },
  };
}

async function expectSqlError(sql: string, pattern: string, params: unknown[] = []) {
  await db.exec("savepoint expect_err");
  try {
    await db.query(sql, params);
    throw new Error(`Expected ${pattern}, but the statement succeeded.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("Expected ")) throw error;
    expect(message.toLowerCase()).toContain(pattern.toLowerCase());
  } finally {
    await db.exec("rollback to savepoint expect_err");
  }
}

async function source(status: string, key: string) {
  const rows = await db.query<{ id: string }>(
    `insert into public.data_sources (source_key, name, collection_method, permissions, validation_status)
     values ($1, $2, 'manual_entry', 'test fixture', $3)
     returning id::text as id`,
    [key, key, status],
  );
  return rows.rows[0].id;
}

describe("foundation schema", () => {
  beforeAll(async () => {
    db = new PGlite();
    const first = await applyMigrations(session(db));
    const second = await applyMigrations(session(db));
    expect(first).toHaveLength(5);
    expect(second).toEqual([]);

    await db.exec(`
      create role intelligence_reader nosuperuser nobypassrls nologin;
      create role intelligence_writer nosuperuser nobypassrls nologin;
      create role intelligence_service nosuperuser bypassrls nologin;
      grant usage on schema public to intelligence_reader, intelligence_writer, intelligence_service;
      grant select on all tables in schema public to intelligence_reader, intelligence_service;
      grant insert on public.articles to intelligence_writer;
      grant usage on schema internal to intelligence_writer;
      grant execute on all functions in schema internal to intelligence_writer;
    `);
  });

  afterAll(async () => {
    await db?.close();
  });

  beforeEach(async () => {
    await db.exec("begin");
  });

  afterEach(async () => {
    await db.exec("reset role");
    await db.exec("rollback");
  });

  it("enables and forces row level security on every public table", async () => {
    const unprotected = await db.query<{ relname: string }>(`
      select c.relname
      from pg_class as c
      join pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and (not c.relrowsecurity or not c.relforcerowsecurity)
    `);
    expect(unprotected.rows).toEqual([]);

    const present = await db.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' order by tablename",
    );
    expect(present.rows.map((row) => row.tablename).sort()).toEqual([...tables].sort());
  });

  it("makes analytical views run with the caller's permissions", async () => {
    const views = await db.query<{ relname: string; reloptions: string[] | null }>(`
      select c.relname, c.reloptions
      from pg_class as c
      join pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'v'
    `);
    expect(views.rows.length).toBeGreaterThan(0);
    for (const view of views.rows) {
      expect(view.reloptions ?? []).toContain("security_invoker=true");
    }
  });

  it("normalizes canonical URLs in the database", async () => {
    for (const fixture of urlFixtures) {
      const rows = await db.query<{ url: string }>(
        "select internal.normalize_url($1) as url",
        [fixture.input],
      );
      expect(rows.rows[0].url).toBe(fixture.expected);
      const again = await db.query<{ url: string }>(
        "select internal.normalize_url(internal.normalize_url($1)) as url",
        [fixture.input],
      );
      expect(again.rows[0].url).toBe(fixture.expected);
    }

    for (const input of invalidUrls) {
      await expectSqlError("select internal.normalize_url($1)", "invalid_url", [input]);
    }
  });

  it("imports an article once, preserves an explicit word count, and refuses to reassign provenance", async () => {
    const sourceId = await source("validated", "articles");
    const first = await db.query<{ id: string; word_count: number; canonical_url: string }>(
      `select id::text, word_count, canonical_url
       from internal.import_article(
         p_canonical_url => $1,
         p_headline => 'Harbor essay',
         p_data_source_id => $2::uuid,
         p_body_text => 'alpha beta gamma',
         p_word_count => 1200,
         p_content_type => 'essay'
       )`,
      ["https://PirateWires.com/p/Harbor/?utm_source=test", sourceId],
    );
    const second = await db.query<{ id: string; headline: string }>(
      `select id::text, headline
       from internal.import_article(
         p_canonical_url => 'https://piratewires.com/p/Harbor',
         p_headline => 'Harbor essay, revised',
         p_data_source_id => $1::uuid
       )`,
      [sourceId],
    );

    expect(second.rows[0].id).toBe(first.rows[0].id);
    expect(first.rows[0].canonical_url).toBe("https://piratewires.com/p/Harbor");
    expect(first.rows[0].word_count).toBe(1200);
    const count = await db.query<{ n: number }>("select count(*)::int as n from public.articles");
    expect(count.rows[0].n).toBe(1);

    const otherSource = await source("validated", "articles-other");
    await expectSqlError(
      `select internal.import_article(
         p_canonical_url => 'https://piratewires.com/p/Harbor',
         p_headline => 'Other source',
         p_data_source_id => $1::uuid
       )`,
      "source_mismatch",
      [otherSource],
    );
  });

  it("counts words only when the source did not provide a count", async () => {
    const sourceId = await source("validated", "words");
    const rows = await db.query<{ word_count: number }>(
      `select word_count
       from internal.import_article(
         p_canonical_url => 'https://example.com/words',
         p_headline => 'Words',
         p_data_source_id => $1::uuid,
         p_body_text => 'alpha  beta   gamma'
       )`,
      [sourceId],
    );
    expect(rows.rows[0].word_count).toBe(3);
  });

  it("keeps illustrative articles out of search and requires an illustrative source", async () => {
    const observedSource = await source("validated", "search-observed");
    const illustrativeSource = await source("illustrative", "search-illustrative");
    await db.query(
      `select internal.import_article(
         p_canonical_url => 'https://example.com/tariff-observed',
         p_headline => 'Tariff essay',
         p_data_source_id => $1::uuid
       )`,
      [observedSource],
    );
    await db.query(
      `select internal.import_article(
         p_canonical_url => 'https://example.com/tariff-illustrative',
         p_headline => 'Tariff illustration',
         p_data_source_id => $1::uuid,
         p_record_status => 'illustrative'
       )`,
      [illustrativeSource],
    );

    await expectSqlError(
      `select internal.import_article(
         p_canonical_url => 'https://example.com/bad-illustrative',
         p_headline => 'Bad',
         p_data_source_id => $1::uuid,
         p_record_status => 'illustrative'
       )`,
      "illustrative_source_required",
      [observedSource],
    );

    const found = await db.query<{ headline: string }>(
      "select headline from internal.search_articles('tariff', 10)",
    );
    expect(found.rows.map((row) => row.headline)).toEqual(["Tariff essay"]);

    const empty = await db.query<{ n: number }>(
      "select count(*)::int as n from internal.search_articles('   ', 10)",
    );
    expect(empty.rows[0].n).toBe(0);

    const analytical = await db.query<{ n: number }>(
      "select count(*)::int as n from public.analytical_articles",
    );
    expect(analytical.rows[0].n).toBe(1);
  });

  it("allows one primary author and derives a topic slug", async () => {
    const sourceId = await source("validated", "people");
    const article = await db.query<{ id: string }>(
      `select id::text as id from internal.import_article(
         p_canonical_url => 'https://example.com/authors',
         p_headline => 'Authors',
         p_data_source_id => $1::uuid
       )`,
      [sourceId],
    );
    const author = await db.query<{ id: string; slug: string }>(
      `insert into public.authors (name, data_source_id)
       values ('Mike Solana', $1::uuid)
       returning id::text as id, slug`,
      [sourceId],
    );
    expect(author.rows[0].slug).toBe("mike-solana");
    const articleId = article.rows[0].id;
    const authorId = author.rows[0].id;
    await db.query(
      `insert into public.article_authors (article_id, author_id, role, position, data_source_id)
       values ($1::uuid, $2::uuid, 'primary', 0, $3::uuid)`,
      [articleId, authorId, sourceId],
    );
    const colleague = await db.query<{ id: string }>(
      `insert into public.authors (name, data_source_id)
       values ('Second Author', $1::uuid)
       returning id::text as id`,
      [sourceId],
    );
    await expectSqlError(
      `insert into public.article_authors (article_id, author_id, role, position, data_source_id)
       values ($1::uuid, $2::uuid, 'primary', 1, $3::uuid)`,
      "article_authors_one_primary",
      [articleId, colleague.rows[0].id, sourceId],
    );

    const topic = await db.query<{ slug: string }>(
      "insert into public.topics (topic_name) values ('Artificial Intelligence') returning slug",
    );
    expect(topic.rows[0].slug).toBe("artificial-intelligence");
  });

  it("keeps metric snapshots idempotent and refuses conflicting measurements", async () => {
    const sourceId = await source("validated", "metrics");
    const article = await db.query<{ id: string }>(
      `select id::text as id from internal.import_article(
         p_canonical_url => 'https://example.com/metrics',
         p_headline => 'Metrics',
         p_data_source_id => $1::uuid
       )`,
      [sourceId],
    );
    const articleId = article.rows[0].id;
    const first = await db.query<{ id: string; updated_at: string; impressions: number | null }>(
      `select id::text, updated_at::text, impressions
       from internal.import_metric_snapshot(
         p_entity_type => 'article',
         p_entity_id => $1::uuid,
         p_captured_at => '2026-11-01T12:00:00Z',
         p_measurement_window => 'cumulative',
         p_data_source_id => $2::uuid,
         p_data_quality => 'observed',
         p_likes => 10
       )`,
      [articleId, sourceId],
    );
    const second = await db.query<{ id: string; updated_at: string }>(
      `select id::text, updated_at::text
       from internal.import_metric_snapshot(
         p_entity_type => 'article',
         p_entity_id => $1::uuid,
         p_captured_at => '2026-11-01T12:00:00Z',
         p_measurement_window => 'cumulative',
         p_data_source_id => $2::uuid,
         p_data_quality => 'observed',
         p_likes => 10
       )`,
      [articleId, sourceId],
    );
    expect(second.rows[0]).toEqual({ id: first.rows[0].id, updated_at: first.rows[0].updated_at });
    expect(first.rows[0].impressions).toBeNull();

    const enriched = await db.query<{ likes: number; bookmarks: number }>(
      `select likes, bookmarks
       from internal.import_metric_snapshot(
         p_entity_type => 'article',
         p_entity_id => $1::uuid,
         p_captured_at => '2026-11-01T12:00:00Z',
         p_measurement_window => 'cumulative',
         p_data_source_id => $2::uuid,
         p_data_quality => 'observed',
         p_bookmarks => 3
       )`,
      [articleId, sourceId],
    );
    expect(enriched.rows[0]).toEqual({ likes: 10, bookmarks: 3 });

    await expectSqlError(
      `select internal.import_metric_snapshot(
         p_entity_type => 'article',
         p_entity_id => $1::uuid,
         p_captured_at => '2026-11-01T12:00:00Z',
         p_measurement_window => 'cumulative',
         p_data_source_id => $2::uuid,
         p_data_quality => 'observed',
         p_likes => 12
       )`,
      "snapshot_conflict",
      [articleId, sourceId],
    );
    await expectSqlError(
      `select internal.import_metric_snapshot(
         p_entity_type => 'article',
         p_entity_id => $1::uuid,
         p_captured_at => '2026-11-02T12:00:00Z',
         p_measurement_window => 'cumulative',
         p_data_source_id => $2::uuid,
         p_data_quality => 'observed'
       )`,
      "snapshot_empty",
      [articleId, sourceId],
    );
    await expectSqlError(
      `select internal.import_metric_snapshot(
         p_entity_type => 'article',
         p_entity_id => '33333333-3333-4333-8333-333333333333',
         p_captured_at => '2026-11-01T12:00:00Z',
         p_measurement_window => 'cumulative',
         p_data_source_id => $1::uuid,
         p_data_quality => 'observed',
         p_likes => 1
       )`,
      "unknown_metric_entity",
      [sourceId],
    );
    await expectSqlError(
      `select internal.import_metric_snapshot(
         p_entity_type => 'article',
         p_entity_id => $1::uuid,
         p_captured_at => '2026-11-03T12:00:00Z',
         p_measurement_window => 'custom',
         p_data_source_id => $2::uuid,
         p_data_quality => 'observed',
         p_likes => 1
       )`,
      "metric_snapshots_custom_window",
      [articleId, sourceId],
    );

    const illustrativeSource = await source("illustrative", "metrics-illustrative");
    await expectSqlError(
      `select internal.import_metric_snapshot(
         p_entity_type => 'article',
         p_entity_id => $1::uuid,
         p_captured_at => '2026-11-04T12:00:00Z',
         p_measurement_window => 'cumulative',
         p_data_source_id => $2::uuid,
         p_data_quality => 'illustrative',
         p_likes => 1
       )`,
      "illustrative_source_required",
      [articleId, sourceId],
    );
    await db.query(
      `select internal.import_metric_snapshot(
         p_entity_type => 'article',
         p_entity_id => $1::uuid,
         p_captured_at => '2026-11-04T12:00:00Z',
         p_measurement_window => 'cumulative',
         p_data_source_id => $2::uuid,
         p_data_quality => 'illustrative',
         p_likes => 99
       )`,
      [articleId, illustrativeSource],
    );
    const visible = await db.query<{ likes: number }>(
      `select likes
       from public.analytical_metric_snapshots
       where entity_id = $1::uuid
       order by likes`,
      [articleId],
    );
    expect(visible.rows.map((row) => row.likes)).toEqual([10]);

    await expectSqlError("delete from public.articles where id = $1::uuid", "metrics_present", [
      articleId,
    ]);
  });

  it("separates confirmed distribution from inferences and keeps follower counts nullable", async () => {
    const sourceId = await source("validated", "distribution");
    const article = await db.query<{ id: string }>(
      `select id::text as id from internal.import_article(
         p_canonical_url => 'https://example.com/distribution',
         p_headline => 'Distribution',
         p_data_source_id => $1::uuid
       )`,
      [sourceId],
    );
    const account = await db.query<{ id: string }>(
      `insert into public.distribution_accounts
         (platform, identifier_kind, account_identifier, account_name, data_source_id)
       values ('x', 'handle', 'piratewires', 'piratewires', $1::uuid)
       returning id::text as id`,
      [sourceId],
    );
    const post = await db.query<{ id: string }>(
      `insert into public.social_posts (platform, account_id, post_url, data_source_id)
       values ('x', $1::uuid, 'https://x.com/piratewires/status/1?utm_source=share', $2::uuid)
       returning id::text as id, post_url`,
      [account.rows[0].id, sourceId],
    );
    const stored = await db.query<{ post_url: string }>(
      "select post_url from public.social_posts where id = $1::uuid",
      [post.rows[0].id],
    );
    expect(stored.rows[0].post_url).toBe("https://x.com/piratewires/status/1");

    await db.query(
      `insert into public.article_social_posts
         (social_post_id, article_id, relationship_type, confirmation_status, data_source_id)
       values ($1::uuid, $2::uuid, 'official_distribution', 'confirmed', $3::uuid)`,
      [post.rows[0].id, article.rows[0].id, sourceId],
    );
    const mention = await db.query<{ id: string }>(
      `insert into public.social_posts (platform, account_id, external_post_id, data_source_id)
       values ('x', $1::uuid, 'mention-1', $2::uuid)
       returning id::text as id`,
      [account.rows[0].id, sourceId],
    );
    await db.query(
      `insert into public.article_social_posts
         (social_post_id, article_id, relationship_type, confirmation_status, confidence, data_source_id)
       values ($1::uuid, $2::uuid, 'mention', 'inferred', 0.4, $3::uuid)`,
      [mention.rows[0].id, article.rows[0].id, sourceId],
    );

    const confirmed = await db.query<{ n: number }>(
      "select count(*)::int as n from public.confirmed_article_posts",
    );
    const inferred = await db.query<{ n: number }>(
      "select count(*)::int as n from public.inferred_article_posts",
    );
    expect(confirmed.rows[0].n).toBe(1);
    expect(inferred.rows[0].n).toBe(1);

    await expectSqlError(
      `insert into public.social_posts (platform, account_id, external_post_id, data_source_id)
       values ('instagram', $1::uuid, 'wrong-platform', $2::uuid)`,
      "platform_mismatch",
      [account.rows[0].id, sourceId],
    );

    await db.query(
      `insert into public.account_observations
         (account_id, observed_at, follower_count, data_quality, data_source_id)
       values ($1::uuid, '2026-10-01T00:00:00Z', 100, 'observed', $2::uuid)`,
      [account.rows[0].id, sourceId],
    );
    await db.query(
      `insert into public.account_observations
         (account_id, observed_at, following_count, data_quality, data_source_id)
       values ($1::uuid, '2026-11-01T00:00:00Z', 20, 'observed', $2::uuid)`,
      [account.rows[0].id, sourceId],
    );
    const latest = await db.query<{ follower_count: number | null; following_count: number | null }>(
      `select follower_count, following_count
       from public.latest_account_observations
       where account_id = $1::uuid`,
      [account.rows[0].id],
    );
    expect(latest.rows[0]).toEqual({ follower_count: null, following_count: 20 });
  });

  it("rejects audience rows that do not match their scope", async () => {
    const sourceId = await source("validated", "audience");
    await expectSqlError(
      `insert into public.audience_observations
         (measurement_timestamp, measurement_window, scope, page_views, data_quality, data_source_id)
       values ('2026-11-01T00:00:00Z', 'day', 'article', 10, 'observed', $1::uuid)`,
      "audience_observations_article_scope",
      [sourceId],
    );
    await db.query(
      `insert into public.audience_observations
         (measurement_timestamp, measurement_window, scope, unique_visitors, data_quality, data_source_id)
       values ('2026-11-01T00:00:00Z', 'day', 'site', 40, 'observed', $1::uuid)`,
      [sourceId],
    );
    const rows = await db.query<{ n: number }>(
      "select count(*)::int as n from public.analytical_audience_observations",
    );
    expect(rows.rows[0].n).toBe(1);
  });

  it("refuses to relabel a simulated report as analytical", async () => {
    const request = await db.query<{ id: string }>(
      `insert into public.research_requests (query, execution_mode)
       values ('Map amplification', 'simulated')
       returning id::text as id`,
    );
    await expectSqlError(
      `insert into public.research_reports (
         request_id, execution_mode, research_question, researched_on, methodology,
         datasets_examined, key_findings, supporting_observations, article_references,
         limitations, opportunities, recommendations
       ) values (
         $1::uuid, 'analytical', 'Map amplification', '2026-11-03', 'Not run.',
         '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
         '["simulated"]'::jsonb, '[]'::jsonb, '[]'::jsonb
       )`,
      "execution_mode_mismatch",
      [request.rows[0].id],
    );
  });

  it("hides rows from a normal role and shows them to a bypass role", async () => {
    const sourceId = await source("validated", "rls");
    await db.query(
      `select internal.import_article(
         p_canonical_url => 'https://example.com/rls',
         p_headline => 'Visible to the server only',
         p_data_source_id => $1::uuid
       )`,
      [sourceId],
    );

    await db.exec("set role intelligence_reader");
    const hidden = await db.query<{ n: number }>(
      "select count(*)::int as n from public.analytical_articles",
    );
    expect(hidden.rows[0].n).toBe(0);
    await db.exec("reset role");

    await db.exec("set role intelligence_service");
    const visible = await db.query<{ n: number }>(
      "select count(*)::int as n from public.analytical_articles",
    );
    expect(visible.rows[0].n).toBe(1);
    await db.exec("reset role");

    await db.exec("set role intelligence_writer");
    await expectSqlError(
      `insert into public.articles (canonical_url, headline, data_source_id)
       values ('https://example.com/writer', 'Nope', $1::uuid)`,
      "row-level security",
      [sourceId],
    );
  });
});
