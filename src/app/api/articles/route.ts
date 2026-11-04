import { connection } from "next/server";
import { z } from "zod";
import { listArticles } from "@/server/articles/query";
import { getSession } from "@/server/db/session";
import { apiError, apiSuccess } from "@/server/http";
import { datasetMode, isResponse } from "@/server/dataset";
import { log } from "@/server/log";

const filters = z.object({
  q: z.string().trim().max(200).optional(),
  topic: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export const maxDuration = 60;

export async function GET(request: Request) {
  await connection();
  const mode = datasetMode(request);
  if (isResponse(mode)) return mode;
  const url = new URL(request.url);
  const parsed = filters.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    topic: url.searchParams.get("topic") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return apiError(400, "invalid_request", "The article query is invalid.", parsed.error.issues);
  }

  try {
    const session = await getSession();
    const result = await listArticles(session, {
      mode: mode.mode,
      q: parsed.data.q || undefined,
      topic: parsed.data.topic || undefined,
      limit: parsed.data.limit,
    });
    return apiSuccess(result, 200, { limit: parsed.data.limit, nextCursor: null });
  } catch (error) {
    log("error", "article list failed", { error: error instanceof Error ? error.name : "unknown" });
    return apiError(503, "database_unavailable", "Articles could not be read.");
  }
}
