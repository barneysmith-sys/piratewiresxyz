/** Token search over publication metadata. Performance figures are not searchable. */

export function searchTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[%_\\]/g, "").trim())
    .filter((token) => token.length >= 2);
}

export function recordMatchesQuery(
  record: { headline: string; author: string; url?: string | null; topic?: string | null; excerpt?: string | null },
  query: string,
): boolean {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return true;
  const haystack = `${record.headline} ${record.author} ${record.url ?? ""} ${record.topic ?? ""} ${record.excerpt ?? ""}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}
