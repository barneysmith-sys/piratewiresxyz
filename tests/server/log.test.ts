import { describe, expect, it } from "vitest";
import { checkDatabase } from "../../src/server/db/health";
import { redact, sanitizeFields } from "../../src/server/log";

describe("logging", () => {
  it("removes connection strings and secret fields", () => {
    expect(redact("failed postgresql://postgres:secret@db.example:5432/app now")).toBe(
      "failed postgresql://[redacted] now",
    );
    expect(
      sanitizeFields({
        DATABASE_URL: "postgresql://postgres:secret@db.example/app",
        code: "snapshot_conflict",
      }),
    ).toEqual({
      DATABASE_URL: "[redacted]",
      code: "snapshot_conflict",
    });
  });
});

describe("database health", () => {
  it("reports an unconfigured database without connecting", async () => {
    await expect(checkDatabase({ DATABASE_URL: undefined })).resolves.toEqual({
      status: "unconfigured",
    });
  });
});
