import { getArticles } from "@/lib/data/articles";
import { recordMatchesQuery } from "@/lib/data/search";
import type { DatasetMode } from "@/lib/data/mode";
import type { Article } from "@/lib/data/types";
import type { ArticleList } from "@/server/articles/query";

const SOURCE = "Pirate Wires";

export function bundledCorpus(): Article[] {
  return getArticles().map((article) => ({
    ...article,
    demo: true,
    publicationVerified: article.publicationVerified ?? false,
    verificationStatus: article.verificationStatus,
    sourceName: article.sourceName ?? SOURCE,
    excerpt: article.excerpt,
  }));
}

export function listBundledArticles(input: {
  mode: DatasetMode;
  q?: string;
  topic?: string;
  id?: string;
  limit?: number;
}): ArticleList {
  if (input.mode === "analytical") {
    return {
      mode: "analytical",
      illustrative: false,
      articles: [],
      observed: [],
      emptyReason: "No observed articles are stored. Illustrative records are excluded from analytical mode.",
    };
  }

  const limit = Math.min(Math.max(input.limit ?? 100, 1), 100);
  const topic = input.topic?.trim().toLowerCase();
  const articles = bundledCorpus()
    .filter((article) => {
      if (input.id && article.id !== input.id) return false;
      if (topic && article.topic.toLowerCase() !== topic) return false;
      return recordMatchesQuery(article, input.q ?? "");
    })
    .slice(0, limit);

  return {
    mode: "demo",
    illustrative: true,
    articles,
    observed: [],
    emptyReason: null,
  };
}

export function bundledAuthorCounts(articles: Article[]): { author: string; articles: number }[] {
  const counts = new Map<string, number>();
  for (const article of articles) counts.set(article.author, (counts.get(article.author) ?? 0) + 1);
  return [...counts.entries()]
    .map(([author, n]) => ({ author, articles: n }))
    .sort((a, b) => b.articles - a.articles || a.author.localeCompare(b.author));
}
