import { CHANNELS, TOPICS, type Article, type Channel, type ObservedRecord, type Topic } from "@/lib/data/types";
import type { DatasetMode } from "@/lib/data/mode";
import type { SqlSession } from "@/server/db/migrate";

export type ArticleList = {
  mode: DatasetMode;
  illustrative: boolean;
  articles: Article[];
  observed: ObservedRecord[];
  emptyReason: string | null;
};

type FixtureRaw = {
  publicId?: string;
  publicationVerified?: boolean;
  readMinutes?: number;
  engagedSec?: number;
  completion?: number;
  trend?: number[];
  distribution?: { channel?: string; posts?: number; impressions?: number; clicks?: number }[];
};

type ArticleRow = {
  record_id: string;
  headline: string;
  canonical_url: string;
  excerpt: string | null;
  record_status: "observed" | "illustrative";
  published_at: string | null;
  author_name: string;
  topic_name: string | null;
  source_name: string;
  views: number | string | null;
  reposts: number | string | null;
  replies: number | string | null;
  raw_observation: FixtureRaw | string | null;
  subscription_event_count: number | string | null;
};

function asNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function asRaw(value: ArticleRow["raw_observation"]): FixtureRaw {
  if (value == null) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as FixtureRaw;
    } catch {
      return {};
    }
  }
  return value;
}

function isTopic(value: string | null): value is Topic {
  return value != null && (TOPICS as readonly string[]).includes(value);
}

function isChannel(value: string | undefined): value is Channel {
  return value != null && (CHANNELS as readonly string[]).includes(value);
}

function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, "\\$&")}%`;
}

export async function listArticles(
  session: SqlSession,
  input: { mode: DatasetMode; q?: string; topic?: string; id?: string; limit?: number },
): Promise<ArticleList> {
  const mode = input.mode;
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 100);
  const rows = await session.query<ArticleRow>(
    `
      select
        a.id::text as record_id,
        a.headline,
        a.canonical_url,
        a.excerpt,
        a.record_status,
        to_char(a.publication_timestamp at time zone 'UTC', 'YYYY-MM-DD') as published_at,
        coalesce(author.name, 'Unknown') as author_name,
        topic.topic_name,
        source.name as source_name,
        snap.views,
        snap.reposts,
        snap.replies,
        snap.raw_observation,
        aud.subscription_event_count
      from public.articles a
      join public.data_sources source on source.id = a.data_source_id
      left join lateral (
        select au.name
        from public.article_authors aa
        join public.authors au on au.id = aa.author_id
        where aa.article_id = a.id
        order by case when aa.role = 'primary' then 0 else 1 end, aa.position
        limit 1
      ) author on true
      left join lateral (
        select t.topic_name
        from public.article_topics at
        join public.topics t on t.id = at.topic_id
        where at.article_id = a.id
          and at.confirmation_status <> 'rejected'
        order by case when at.confirmation_status = 'confirmed' then 0 else 1 end, t.topic_name
        limit 1
      ) topic on true
      left join lateral (
        select m.views, m.reposts, m.replies, m.raw_observation
        from public.metric_snapshots m
        where m.entity_type = 'article'
          and m.entity_id = a.id
          and ($2::boolean or m.data_quality <> 'illustrative')
        order by m.captured_at desc
        limit 1
      ) snap on true
      left join lateral (
        select o.subscription_event_count
        from public.audience_observations o
        where o.article_id = a.id
          and o.scope = 'article'
          and ($2::boolean or o.data_quality <> 'illustrative')
        order by o.measurement_timestamp desc
        limit 1
      ) aud on true
      where a.record_status = $1
        and (
          $3::text is null
          or a.headline ilike $3 escape '\\'
          or a.canonical_url ilike $3 escape '\\'
          or author.name ilike $3 escape '\\'
        )
        and ($4::text is null or topic.topic_name = $4)
        and (
          $6::text is null
          or a.id::text = $6
          or snap.raw_observation->>'publicId' = $6
        )
      order by a.publication_timestamp desc nulls last, a.headline
      limit $5
    `,
    [
      mode === "demo" ? "illustrative" : "observed",
      mode === "demo",
      input.q ? likePattern(input.q) : null,
      input.topic ?? null,
      limit,
      input.id ?? null,
    ],
  );

  const articles: Article[] = [];
  const observed: ObservedRecord[] = [];

  for (const row of rows) {
    const raw = asRaw(row.raw_observation);
    const publicId = raw.publicId ?? row.record_id;
    const views = asNumber(row.views);
    const record: ObservedRecord = {
      id: publicId,
      recordId: row.record_id,
      headline: row.headline,
      author: row.author_name,
      publishedAt: row.published_at,
      topic: row.topic_name,
      url: row.canonical_url,
      views,
      sourceName: row.source_name,
      demo: row.record_status === "illustrative",
    };
    if (mode === "analytical") observed.push(record);

    const distribution = (raw.distribution ?? []).flatMap((item) => {
      if (!isChannel(item.channel)) return [];
      const posts = item.posts ?? 0;
      const impressions = item.impressions ?? 0;
      const clicks = item.clicks ?? 0;
      if (posts <= 0) return [];
      return [{ channel: item.channel, posts, impressions, clicks }];
    });
    const trend = Array.isArray(raw.trend) ? raw.trend.filter((value) => typeof value === "number") : [];
    const engagedSec = typeof raw.engagedSec === "number" ? raw.engagedSec : null;
    const completion = typeof raw.completion === "number" ? raw.completion : null;
    const shares = asNumber(row.reposts);
    const comments = asNumber(row.replies);
    const subsGained = asNumber(row.subscription_event_count);
    const readMinutes = typeof raw.readMinutes === "number" ? raw.readMinutes : null;
    const complete =
      isTopic(row.topic_name) &&
      row.published_at != null &&
      views != null &&
      engagedSec != null &&
      completion != null &&
      shares != null &&
      comments != null &&
      subsGained != null &&
      readMinutes != null &&
      trend.length >= 14 &&
      distribution.length > 0;

    if (!complete || !isTopic(row.topic_name) || row.published_at == null || readMinutes == null) continue;
    articles.push({
      id: publicId,
      recordId: row.record_id,
      headline: row.headline,
      author: row.author_name,
      publishedAt: row.published_at,
      topic: row.topic_name,
      url: row.canonical_url,
      readMinutes,
      metrics: {
        views: views as number,
        engagedSec: engagedSec as number,
        completion: completion as number,
        shares: shares as number,
        comments: comments as number,
        subsGained: subsGained as number,
      },
      distribution,
      trend: trend.slice(0, 14),
      demo: row.record_status === "illustrative",
      publicationVerified: raw.publicationVerified === true,
      sourceName: row.source_name,
      excerpt: row.excerpt,
    });
  }

  const emptyReason =
    mode === "analytical" && observed.length === 0
      ? "No observed articles are stored. Illustrative records are excluded from analytical mode."
      : mode === "demo" && articles.length === 0
        ? "The illustrative corpus is not in this database."
        : null;

  return {
    mode,
    illustrative: mode === "demo",
    articles,
    observed,
    emptyReason,
  };
}
