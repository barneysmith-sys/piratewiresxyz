export function GET() {
  return Response.json({
    data: {
      service: "pw-intelligence",
      phase: "integrated",
      description:
        "Pirate Wires media intelligence. Demo mode is the labelled illustrative corpus. Analytical mode reads observed rows only.",
      implemented: {
        index: "/api",
        health: "/api/health",
        articles: "/api/articles?mode=demo|analytical",
        article: "/api/articles/:id?mode=demo|analytical",
        analytics: "/api/analytics/overview|topics|authors|distribution|performance",
        research: "/api/research",
        researchStream: "/api/research/stream",
      },
      specifiedIn: "docs/api.md",
    },
  });
}
