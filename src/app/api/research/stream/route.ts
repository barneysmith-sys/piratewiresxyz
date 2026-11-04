import { connection } from "next/server";
import { z } from "zod";
import { executeResearch } from "@/server/research/execute";
import { getSession } from "@/server/db/session";
import { apiError } from "@/server/http";
import { log } from "@/server/log";

const bodySchema = z.object({
  query: z.string().trim().min(1).max(4_000),
  articleIds: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
  mode: z.enum(["demo", "analytical"]).default("analytical"),
});

export const maxDuration = 60;

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        const session = await getSession();
        await executeResearch(session, { ...parsed.data, yieldMs: 80 }, send);
      } catch (error) {
        log("error", "research stream failed", { error: error instanceof Error ? error.name : "unknown" });
        send({ type: "error", message: error instanceof Error ? error.message : "Research failed." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
