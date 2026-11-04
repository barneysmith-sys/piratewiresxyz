import type { SqlSession } from "@/server/db/migrate";

export type TopicCount = {
  topic: string;
  articles: number;
};

/**
 * topic.article_count — observed articles with a confirmed topic.
 * Proposed and rejected assignments are not included. Illustrative articles
 * are not in analytical_articles, so they cannot enter this count.
 */
export async function confirmedTopicCounts(session: SqlSession): Promise<TopicCount[]> {
  const rows = await session.query<{ topic: string; articles: number | string }>(`
    select t.topic_name as topic, count(distinct a.id)::int as articles
    from public.analytical_articles a
    join public.article_topics at
      on at.article_id = a.id
     and at.confirmation_status = 'confirmed'
    join public.topics t on t.id = at.topic_id
    group by t.topic_name
    order by articles desc, t.topic_name
  `);
  return rows.map((row) => ({ topic: row.topic, articles: Number(row.articles) }));
}

export async function authorPublicationCounts(
  session: SqlSession,
  recordStatus: "observed" | "illustrative",
): Promise<{ author: string; articles: number }[]> {
  const rows = await session.query<{ author: string; articles: number | string }>(
    `
      select au.name as author, count(distinct a.id)::int as articles
      from public.articles a
      join public.article_authors aa
        on aa.article_id = a.id
       and aa.role = 'primary'
      join public.authors au on au.id = aa.author_id
      where a.record_status = $1
      group by au.name
      order by articles desc, au.name
    `,
    [recordStatus],
  );
  return rows.map((row) => ({ author: row.author, articles: Number(row.articles) }));
}

export async function confirmedDistributionCount(session: SqlSession): Promise<number> {
  const rows = await session.query<{ n: number | string }>(`
    select count(*)::int as n from public.confirmed_article_posts
  `);
  return Number(rows[0]?.n ?? 0);
}

export async function analyticalAudienceCount(session: SqlSession): Promise<number> {
  const rows = await session.query<{ n: number | string }>(`
    select count(*)::int as n from public.analytical_audience_observations
  `);
  return Number(rows[0]?.n ?? 0);
}
