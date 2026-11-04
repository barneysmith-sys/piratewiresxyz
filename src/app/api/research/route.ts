import { connection } from "next/server";
import { z } from "zod";
import { executeResearch } from "@/server/research/execute";
import { getSession } from "@/server/db/session";
import { apiError, apiSuccess } from "@/server/http";
import { log } from "@/server/log";

const bodySchema = z.object({
  query: z.string().trim().min(1).max(4_000),
  articleIds: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
  mode: z.enum(["demo", "analytical"]).default("analytical"),
});

export async function POST(request: Request) {
  await connection();
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "invalid_request", "Research requests must be JSON.");
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "invalid_request", "The research request is invalid.", parsed.error.issues);
  }

  try {
    const session = await getSession();
    const result = await executeResearch(session, parsed.data);
    return apiSuccess({
      requestId: result.requestId,
      mode: parsed.data.mode,
      illustrative: parsed.data.mode === "demo",
      report: result.report,
    });
  } catch (error) {
    log("error", "research run failed", { error: error instanceof Error ? error.name : "unknown" });
    return apiError(503, "database_unavailable", error instanceof Error ? error.message : "Research failed.");
  }
}
