import { connection } from "next/server";
import { authorPublicationCounts } from "@/server/analytics/topics";
import { getSession } from "@/server/db/session";
import { apiError, apiSuccess } from "@/server/http";
import { datasetMode, isResponse } from "@/server/dataset";
import { log } from "@/server/log";

export async function GET(request: Request) {
  await connection();
  const mode = datasetMode(request);
  if (isResponse(mode)) return mode;

  try {
    const session = await getSession();
    const authors = await authorPublicationCounts(session, mode.mode === "demo" ? "illustrative" : "observed");
    return apiSuccess({
      mode: mode.mode,
      illustrative: mode.mode === "demo",
      authors,
      note:
        mode.mode === "demo"
          ? "Primary-author counts inside the illustrative corpus. Not a ranking of Pirate Wires writers."
          : "Observed articles per primary author. Frequency is not an engagement ranking.",
    });
  } catch (error) {
    log("error", "author analytics failed", { error: error instanceof Error ? error.name : "unknown" });
    return apiError(503, "database_unavailable", "Author analytics could not be read.");
  }
}
