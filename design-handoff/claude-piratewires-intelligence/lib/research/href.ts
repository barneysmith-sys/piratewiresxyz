/** Build a shareable research URL. */
export function researchHref(query: string, articleIds?: string[]) {
  const p = new URLSearchParams({ q: query });
  if (articleIds?.length) p.set("ids", articleIds.join(","));
  return `/research?${p.toString()}`;
}
