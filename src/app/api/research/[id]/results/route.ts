import { connection } from "next/server";
import { getSession } from "@/server/db/session";
import { apiError, apiSuccess } from "@/server/http";
import { log } from "@/server/log";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await context.params;

  try {
    const session = await getSession();
    const rows = await session.query<{
      execution_mode: string;
      research_question: string;
      limitations: unknown;
      recommendations: unknown;
      key_findings: unknown;
      visualization_specs: unknown;
    }>(
      `
        select execution_mode, research_question, limitations, recommendations, key_findings, visualization_specs
        from public.research_reports
        where request_id = $1::uuid
      `,
      [id],
    );
    const row = rows[0];
    if (!row) return apiError(404, "not_found", "This request has no stored report.");
    const specs = Array.isArray(row.visualization_specs) ? row.visualization_specs : [];
    const workspace = specs.find((spec) => spec && typeof spec === "object" && "report" in spec) as
      | { report?: unknown }
      | undefined;
    return apiSuccess({
      executionMode: row.execution_mode,
      illustrative: row.execution_mode === "simulated",
      researchQuestion: row.research_question,
      limitations: row.limitations,
      findings: row.key_findings,
      recommendations: row.recommendations,
      report: workspace?.report ?? null,
    });
  } catch (error) {
    log("error", "research results failed", { error: error instanceof Error ? error.name : "unknown" });
    return apiError(503, "database_unavailable", "The research report could not be read.");
  }
}
