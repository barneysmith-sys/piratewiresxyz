import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const migrationsDirectory = path.join(process.cwd(), "supabase", "migrations");

export type SqlSession = {
  exec(sql: string): Promise<void>;
  query<T extends Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
};

export async function loadMigrations(directory = migrationsDirectory) {
  const names = (await readdir(/*turbopackIgnore: true*/ directory))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  return Promise.all(
    names.map(async (name) => ({
      name,
      sql: await readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ directory, name), "utf8"),
    })),
  );
}

/**
 * Applies pending SQL files in filename order.
 * exec and query must share one session. Each file runs in one transaction.
 */
export async function applyMigrations(
  session: SqlSession,
  directory = migrationsDirectory,
): Promise<string[]> {
  await session.exec(`
    create schema if not exists internal;
    create table if not exists internal.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const appliedRows = await session.query<{ filename: string }>(
    "select filename from internal.schema_migrations",
  );
  const applied = new Set(appliedRows.map((row) => row.filename));
  const migrations = await loadMigrations(directory);
  const ran: string[] = [];

  for (const migration of migrations) {
    if (applied.has(migration.name)) continue;
    await session.exec("begin");
    try {
      await session.exec(migration.sql);
      await session.query(
        "insert into internal.schema_migrations (filename) values ($1)",
        [migration.name],
      );
      await session.exec("commit");
      ran.push(migration.name);
    } catch (error) {
      try {
        await session.exec("rollback");
      } catch {
        // The session may already be aborted.
      }
      throw error;
    }
  }

  return ran;
}
