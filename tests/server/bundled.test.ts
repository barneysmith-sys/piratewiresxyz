import { describe, expect, it } from "vitest";
import { listBundledArticles } from "../../src/server/demo/catalog";
import { executeBundledResearch } from "../../src/server/demo/run";

describe("bundled demo", () => {
  it("serves the 26 illustrative articles without a database", () => {
    const list = listBundledArticles({ mode: "demo", limit: 100 });
    expect(list.illustrative).toBe(true);
    expect(list.articles).toHaveLength(26);
    expect(list.articles.every((article) => article.demo)).toBe(true);
    expect(list.observed).toEqual([]);
  });

  it("keeps analytical mode empty", () => {
    const list = listBundledArticles({ mode: "analytical" });
    expect(list.articles).toEqual([]);
    expect(list.observed).toEqual([]);
    expect(list.illustrative).toBe(false);
  });

  it("filters the corpus by topic and query", () => {
    const ai = listBundledArticles({ mode: "demo", topic: "AI" });
    expect(ai.articles.length).toBeGreaterThan(0);
    expect(ai.articles.every((article) => article.topic === "AI")).toBe(true);
    const one = listBundledArticles({ mode: "demo", q: "Doom Analysis" });
    expect(one.articles).toHaveLength(1);
    expect(one.articles[0]?.author).toBe("Mike Solana");
    expect(one.articles[0]?.publishedAt).toBe("2026-10-06");
    expect(one.articles[0]?.url).toBe("https://www.piratewires.com/p/doom-analysis");
    expect(one.articles[0]?.publicationVerified).toBe(true);
    const all = listBundledArticles({ mode: "demo", limit: 100 });
    expect(all.articles.every((article) => article.publicationVerified && article.url.startsWith("https://www.piratewires.com/p/"))).toBe(true);
    expect(all.articles.some((article) => article.headline.includes("Compute Cartel"))).toBe(false);
  });

  it("builds a labelled simulated report and skips audience measurement", async () => {
    const events: { type: string; stage?: string; status?: string }[] = [];
    const { report } = await executeBundledResearch(
      { query: "Analyze AI coverage performance and growth opportunities", mode: "demo", yieldMs: 0 },
      (event) => events.push(event),
    );
    expect(report.provenance).toBe("simulated");
    expect(report.headline).toMatch(/reach vs archive/);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.limitations.some((line) => /not Pirate Wires performance/i.test(line))).toBe(true);
    expect(events.some((event) => event.type === "stage" && event.stage === "audience" && event.status === "skipped")).toBe(true);
    expect(events.at(-1)?.type).toBe("done");
  });
});
