/** Build a shareable research URL. */
export function researchHref(
  query: string,
  articleIds?: string[],
  mode: "demo" | "analytical" = "demo",
  lens?: string | null,
) {
  const p = new URLSearchParams({ q: query, mode });
  if (articleIds?.length) p.set("ids", articleIds.join(","));
  if (lens === "articles" || lens === "topics" || lens === "audience") p.set("lens", lens);
  return `/research?${p.toString()}`;
}
