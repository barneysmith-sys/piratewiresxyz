/** Build a shareable research URL. */
export function researchHref(query: string, articleIds?: string[], mode: "demo" | "analytical" = "demo") {
  const p = new URLSearchParams({ q: query, mode });
  if (articleIds?.length) p.set("ids", articleIds.join(","));
  return `/research?${p.toString()}`;
}
