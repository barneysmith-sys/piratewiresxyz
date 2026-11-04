import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import { seedIllustrativeCorpus } from "@/server/demo/seed";
import { getServerEnv } from "@/server/env";
import { applyMigrations, type SqlSession } from "./migrate";

const sandboxDirectory = path.join(process.cwd(), "data", "sandbox");

let opening: Promise<SqlSession> | null = null;

function postgresSession(sql: postgres.Sql): SqlSession {
  return {
    async exec(statement: string) {
      await sql.unsafe(statement);
    },
    async query<T extends Record<string, unknown>>(statement: string, params: unknown[] = []) {
      const rows = await sql.unsafe(statement, params as never[]);
      return Array.from(rows) as unknown as T[];
    },
  };
}

async function open(): Promise<SqlSession> {
  const env = getServerEnv();
  let session: SqlSession;

  if (env.DATABASE_URL) {
    const sql = postgres(env.DATABASE_URL, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 5,
    });
    session = postgresSession(sql);
  } else {
    mkdirSync(path.dirname(sandboxDirectory), { recursive: true });
    const database = new PGlite(sandboxDirectory);
    await database.waitReady;
    session = {
      exec: async (statement: string) => {
        await database.exec(statement);
      },
      query: async <T extends Record<string, unknown>>(statement: string, params?: unknown[]) => {
        const result = await database.query<T>(statement, params);
        return result.rows;
      },
    };
  }

  await applyMigrations(session);
  const seedIllustrative = !env.DATABASE_URL || process.env.SEED_ILLUSTRATIVE === "true";
  if (seedIllustrative) await seedIllustrativeCorpus(session);
  return session;
}

/**
 * One server session. Postgres when DATABASE_URL is set; otherwise a file-backed
 * PGlite sandbox so the interface can run without hosted credentials.
 */
export function getSession(): Promise<SqlSession> {
  opening ??= open().catch((error) => {
    opening = null;
    throw error;
  });
  return opening;
}
