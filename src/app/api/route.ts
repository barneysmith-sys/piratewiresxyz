export function GET() {
  return Response.json({
    data: {
      service: "pw-intelligence",
      phase: "foundation",
      description:
        "Pirate Wires media intelligence API. The visual interface is supplied separately and owns the site routes.",
      implemented: {
        index: "/api",
        health: "/api/health",
      },
      specifiedIn: "docs/api.md",
    },
  });
}
