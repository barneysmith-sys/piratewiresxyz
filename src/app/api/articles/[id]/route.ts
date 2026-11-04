import { connection } from "next/server";
import { listArticles } from "@/server/articles/query";
import { getSession } from "@/server/db/session";
import { apiError, apiSuccess } from "@/server/http";
import { datasetMode, isResponse } from "@/server/dataset";
import { log } from "@/server/log";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  await connection();
  const mode = datasetMode(request);
  if (isResponse(mode)) return mode;
  const { id } = await context.params;

  try {
    const session = await getSession();
    const result = await listArticles(session, { mode: mode.mode, id, limit: 1 });
    const article = result.articles[0] ?? null;
    const observed = result.observed[0] ?? null;
    if (!article && !observed) {
      return apiError(404, "not_found", "No article with that id is visible in this mode.");
    }
    return apiSuccess({
      mode: result.mode,
      illustrative: result.illustrative,
      article,
      observed,
    });
  } catch (error) {
    log("error", "article detail failed", { error: error instanceof Error ? error.name : "unknown" });
    return apiError(503, "database_unavailable", "The article could not be read.");
  }
}
