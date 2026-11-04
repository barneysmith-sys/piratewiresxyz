import { z } from "zod";
import type { DatasetMode } from "@/lib/data/mode";
import { apiError } from "@/server/http";

const modeSchema = z.enum(["demo", "analytical"]).default("analytical");

export function datasetMode(request: Request): { mode: DatasetMode } | Response {
  const value = new URL(request.url).searchParams.get("mode");
  const parsed = modeSchema.safeParse(value ?? undefined);
  if (!parsed.success) {
    return apiError(400, "invalid_request", "mode must be demo or analytical.");
  }
  return { mode: parsed.data };
}

export function isResponse(value: { mode: DatasetMode } | Response): value is Response {
  return value instanceof Response;
}
