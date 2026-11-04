import { buildIllustrativeCorpus } from "@/lib/data/articles";
import type { SqlSession } from "@/server/db/migrate";

const SOURCE_KEY = "illustrative-sandbox-corpus";

async function one<T extends Record<string, unknown>>(
  session: SqlSession,
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const rows = await session.query<T>(sql, params);
  const row = rows[0];
  if (!row) throw new Error("Expected a database row.");
  return row;
}

async function idFor(
  session: SqlSession,
  selectSql: string,
  insertSql: string,
  params: unknown[],
): Promise<string> {
  const existing = await session.query<{ id: string }>(selectSql, params);
  if (existing[0]?.id) return existing[0].id;
  const inserted = await one<{ id: string }>(session, insertSql, params);
  return inserted.id;
}

/**
 * Stores the design corpus as illustrative rows. Re-running does nothing once
 * the source has articles. These rows fail the analytical views by construction.
 */
export async function seedIllustrativeCorpus(session: SqlSession): Promise<{ seeded: boolean; articles: number }> {
  const existing = await session.query<{ n: number | string }>(
    `
      select count(*)::int as n
      from public.articles a
      join public.data_sources s on s.id = a.data_source_id
      where s.source_key = $1
    `,
    [SOURCE_KEY],
  );
  if (Number(existing[0]?.n ?? 0) > 0) return { seeded: false, articles: Number(existing[0]?.n ?? 0) };

  await session.exec("begin");
  try {
    const source = await one<{ id: string }>(
      session,
      `
        insert into public.data_sources (
          source_key, name, collection_method, permissions, validation_status, notes, original_identifier
        ) values (
          $1,
          'Pirate Wires',
          'illustrative_fixture',
          'Publication metadata from the public Pirate Wires archive. Performance snapshots on these rows are illustrative.',
          'illustrative',
          'Verified headlines, bylines, dates and URLs. Illustrative metrics are excluded from every analytical view.',
          'claude-design-corpus-seed-4242'
        )
        returning id::text as id
      `,
      [SOURCE_KEY],
    );

    const corpus = buildIllustrativeCorpus();
    const authors = new Map<string, string>();
    const topics = new Map<string, string>();
    const categories = new Map<string, string>();

    for (const article of corpus) {
      if (!authors.has(article.author)) {
        authors.set(
          article.author,
          await idFor(
            session,
            `select id::text as id from public.authors where lower(name) = lower($1) and data_source_id = $2::uuid`,
            `
              insert into public.authors (name, data_source_id, metadata)
              values ($1, $2::uuid, '{"illustrative": true}'::jsonb)
              returning id::text as id
            `,
            [article.author, source.id],
          ),
        );
      }
      if (!topics.has(article.topic)) {
        topics.set(
          article.topic,
          await idFor(
            session,
            `select id::text as id from public.topics where lower(topic_name) = lower($1)`,
            `insert into public.topics (topic_name) values ($1) returning id::text as id`,
            [article.topic],
          ),
        );
      }
      if (!categories.has(article.topic)) {
        categories.set(
          article.topic,
          await idFor(
            session,
            `select id::text as id from public.categories where lower(name) = lower($1)`,
            `insert into public.categories (name) values ($1) returning id::text as id`,
            [article.topic],
          ),
        );
      }

      const imported = await one<{ id: string }>(
        session,
        `
          select id::text as id
          from internal.import_article(
            $1, $2, $3::uuid, null, $4::timestamptz, $5::uuid, 'essay', $6, null, null, $1, 'illustrative', now()
          )
        `,
        [
          article.url,
          article.headline,
          source.id,
          `${article.publishedAt}T12:00:00Z`,
          categories.get(article.topic),
          article.excerpt ?? "Published Pirate Wires article. Performance figures stored with this row are illustrative.",
        ],
      );

      await session.query(
        `
          insert into public.article_authors (article_id, author_id, role, position, data_source_id)
          values ($1::uuid, $2::uuid, 'primary', 0, $3::uuid)
          on conflict do nothing
        `,
        [imported.id, authors.get(article.author), source.id],
      );
      await session.query(
        `
          insert into public.article_topics (
            article_id, topic_id, classification_source, confirmation_status, confidence, classifier, confirmed_at, data_source_id
          ) values (
            $1::uuid, $2::uuid, 'import', 'confirmed', 1, 'illustrative-fixture', now(), $3::uuid
          )
          on conflict do nothing
        `,
        [imported.id, topics.get(article.topic), source.id],
      );

      const captured = new Date(`${article.publishedAt}T12:00:00Z`);
      captured.setUTCDate(captured.getUTCDate() + 14);
      const raw = {
        fixture: "claude-design-corpus",
        publicId: article.id,
        publicationVerified: article.publicationVerified === true,
        readMinutes: article.readMinutes,
        engagedSec: article.metrics.engagedSec,
        completion: article.metrics.completion,
        trend: article.trend,
        distribution: article.distribution,
        note: "Illustrative measurements for the interface. Not observed Pirate Wires performance.",
      };
      await session.query(
        `
          select id
          from internal.import_metric_snapshot(
            'article',
            $1::uuid,
            $2::timestamptz,
            'cumulative',
            $3::uuid,
            'illustrative',
            null,
            $4::bigint,
            null,
            $5::bigint,
            $6::bigint,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            $2::timestamptz,
            $7::jsonb
          )
        `,
        [
          imported.id,
          captured.toISOString(),
          source.id,
          article.metrics.views,
          article.metrics.shares,
          article.metrics.comments,
          JSON.stringify(raw),
        ],
      );
      await session.query(
        `
          insert into public.audience_observations (
            measurement_timestamp, measurement_window, scope, article_id,
            subscription_event_count, data_quality, data_source_id
          ) values ($1::timestamptz, 'day', 'article', $2::uuid, $3::bigint, 'illustrative', $4::uuid)
        `,
        [captured.toISOString(), imported.id, article.metrics.subsGained, source.id],
      );
    }

    await session.exec("commit");
    return { seeded: true, articles: corpus.length };
  } catch (error) {
    try {
      await session.exec("rollback");
    } catch {
      // The transaction may already be closed.
    }
    throw error;
  }
}
