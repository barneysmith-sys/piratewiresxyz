import path from "node:path";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import { getServerEnv } from "../env";
import { redact } from "../log";
import { applyMigrations } from "./migrate";

export async function migrateDatabase(): Promise<string[]> {
  const env = getServerEnv();
  const connectionString = env.DIRECT_DATABASE_URL ?? env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Set DIRECT_DATABASE_URL or DATABASE_URL before migrating.");
  }

  const sql = postgres(connectionString, {
    prepare: false,
    max: 1,
    connect_timeout: 15,
  });

  try {
    return await applyMigrations({
      exec: async (statement) => {
        await sql.unsafe(statement);
      },
      query: async <T extends Record<string, unknown>>(statement: string, params?: unknown[]) => {
        const rows = await sql.unsafe(statement, (params ?? []) as never[]);
        return Array.from(rows) as unknown as T[];
      },
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main() {
  try {
    const applied = await migrateDatabase();
    if (applied.length === 0) {
      console.log("No pending migrations.");
    } else {
      console.log(`Applied: ${applied.join(", ")}`);
    }
  } catch (error) {
    const message = error instanceof Error ? redact(error.message) : "Migration failed.";
    console.error(message);
    process.exitCode = 1;
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  await main();
}
