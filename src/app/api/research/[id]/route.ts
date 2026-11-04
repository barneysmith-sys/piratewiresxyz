import { connection } from "next/server";
import { getSession } from "@/server/db/session";
import { apiError, apiSuccess } from "@/server/http";
import { log } from "@/server/log";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await context.params;

  try {
    const session = await getSession();
    const requests = await session.query<Record<string, unknown>>(
      `
        select id::text, query, intent, status, execution_mode, error_message,
               requested_at, started_at, completed_at
        from public.research_requests
        where id = $1::uuid
      `,
      [id],
    );
    const requestRow = requests[0];
    if (!requestRow) return apiError(404, "not_found", "No research request with that id.");
    const tasks = await session.query<Record<string, unknown>>(
      `
        select stage, stage_order, status, outputs, errors, started_at, finished_at
        from public.research_tasks
        where request_id = $1::uuid
        order by stage_order
      `,
      [id],
    );
    return apiSuccess({ request: requestRow, tasks });
  } catch (error) {
    log("error", "research status failed", { error: error instanceof Error ? error.name : "unknown" });
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("invalid") || message.toLowerCase().includes("uuid")) {
      return apiError(400, "invalid_request", "Research ids are UUIDs.");
    }
    return apiError(503, "database_unavailable", "The research request could not be read.");
  }
}
