/**
 * Research prompt catalogue + ranking.
 * Suggestions are prompts the research engine knows how to plan for; the
 * user's own text is always runnable as-is.
 */
export interface Suggestion {
  id: string;
  text: string;
  /** Hint shown on the right of the row. */
  kind: "research" | "compare" | "articles" | "distribution" | "audience";
}

export const OPENING_QUERY = "Analyze AI coverage performance";

export const FEATURED: Suggestion[] = [
  { id: "f1", text: "Analyze AI coverage performance and growth opportunities", kind: "research" },
  { id: "f2", text: "How does AI coverage compare with other topics?", kind: "compare" },
  { id: "f3", text: "Which articles generate the strongest engagement?", kind: "articles" },
  { id: "f4", text: "Identify distribution opportunities for AI coverage", kind: "distribution" },
];

const CATALOGUE: Suggestion[] = [
  ...FEATURED,
  { id: "c1", text: "Which channels drive the most subscriptions?", kind: "distribution" },
  { id: "c2", text: "Compare Defense and Tech Policy readership", kind: "compare" },
  { id: "c3", text: "Which authors hold attention the longest?", kind: "audience" },
  { id: "c4", text: "What topics are under-covered relative to demand?", kind: "research" },
  { id: "c5", text: "Analyze Energy coverage performance", kind: "research" },
  { id: "c6", text: "Where does Politics coverage get shared?", kind: "distribution" },
  { id: "c7", text: "Which articles had the longest tail of traffic?", kind: "articles" },
  { id: "c8", text: "Who reads our AI coverage to the end?", kind: "audience" },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Token-prefix scoring: cheap, predictable and good enough for ~100 prompts. */
export function rankSuggestions(input: string, limit = 4): Suggestion[] {
  const q = norm(input);
  if (!q) return FEATURED.slice(0, limit);
  const tokens = q.split(" ");
  const scored = CATALOGUE.map((s) => {
    const t = norm(s.text);
    const words = t.split(" ");
    let score = 0;
    for (const tok of tokens) {
      if (words.some((w) => w === tok)) score += 3;
      else if (words.some((w) => w.startsWith(tok))) score += 2;
      else if (t.includes(tok)) score += 1;
      else score -= 1;
    }
    if (t.startsWith(q)) score += 6;
    if (FEATURED.includes(s)) score += 0.5;
    return { s, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.s);
}
