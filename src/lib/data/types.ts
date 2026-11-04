/** Domain types for the Intelligence Database. Mirror these in your backend. */

export const TOPICS = ["AI", "Tech Policy", "Defense", "Energy", "Politics", "Media", "Culture", "Crypto"] as const;
export type Topic = (typeof TOPICS)[number];

export const CHANNELS = ["Newsletter", "X", "LinkedIn", "YouTube", "Podcast", "Reddit", "Hacker News"] as const;
export type Channel = (typeof CHANNELS)[number];

export interface ChannelDistribution {
  channel: Channel;
  posts: number;
  impressions: number;
  clicks: number;
}

export interface ArticleMetrics {
  views: number;
  /** average engaged time, seconds */
  engagedSec: number;
  /** 0–1 share of readers reaching the end */
  completion: number;
  shares: number;
  comments: number;
  /** paid + free subscriptions attributed to the article */
  subsGained: number;
}

export interface ObservedRecord {
  id: string;
  recordId: string;
  headline: string;
  author: string;
  publishedAt: string | null;
  topic: string | null;
  url: string;
  views: number | null;
  sourceName: string;
  demo: boolean;
}

export interface Article {
  id: string;
  headline: string;
  author: string;
  publishedAt: string; // ISO date
  topic: Topic;
  url: string;
  readMinutes: number;
  metrics: ArticleMetrics;
  distribution: ChannelDistribution[];
  /** daily views for the first 14 days after publication */
  trend: number[];
  /** true for illustrative sample records. Never mix with live data unflagged. */
  demo: boolean;
  /** Database primary key when the row was loaded from the API. */
  recordId?: string;
  sourceName?: string;
  excerpt?: string | null;
}
