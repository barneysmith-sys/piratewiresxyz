# Architecture

## Repository audit

Inspected on 3 November 2026 (America/New_York).

| Area | Finding |
| --- | --- |
| Framework | None. The repository was one commit and a title-only README. |
| Dependencies | None. |
| Application routes | None. |
| Database | None. No Supabase project is linked from this environment. |
| Environment | None. |
| Deployment | None. No Vercel project is linked. |
| Integrations | None. |
| Tests | None. |

Nothing working had to be preserved. The app is a Next.js 16 App Router service, TypeScript, with SQL migrations aimed at Supabase Postgres.

## Shape

```text
src/app/api          HTTP adapters. Thin. No metric math.
src/domain           Enums, Zod contracts, metric definitions. No I/O.
src/server/db        Postgres access, migrations, health.
supabase/migrations  Schema source of truth.
```

Later phases add `src/server/ingestion`, `src/server/analytics`, and `src/server/research`. Those modules will call SQL and pure functions. React components, when the design arrives, will call the HTTP API. They will not calculate baselines.

The browser does not receive a Supabase client. The server uses a Postgres connection string. Row Level Security is enabled and forced on every public table, with no policies for `anon` or `authenticated`. A role without `BYPASSRLS` sees nothing. The application connection is the privileged one and must stay on the server.

`internal` holds triggers, importers, and search. It must not be added to the Supabase exposed schemas. Integrity triggers that read other tables are `security definer` with `search_path = pg_catalog`. Import functions are not. They run as the caller, so a restricted role cannot use them to skip RLS.

## Why this shape

**SQL is the schema source of truth.** RLS, generated search vectors, exclusion of illustrative rows, and idempotency are data rules. An ORM schema would be a second definition of the same rules.

**TypeScript does the request path.** One deployable Next.js service is enough for the sandbox. Analytical functions will live in `src/server/analytics` and be tested without React.

**Python is not a second service yet.** The preferred stack lists Python for data processing. There is no batch job that needs it. Adding a runtime before there is a job would split the contract. When a job needs pandas or a statistical library, it should be a `python/` worker that reads and writes this same schema. It should not reimplement the metric definitions.

**UUIDs, not identity columns.** The API will expose ids. Random UUIDs are the portable Supabase default. The catalog will not be large enough for UUIDv4 index fragmentation to matter. Revisit if a table moves into the tens of millions of rows.

**No cache of analytical results in Phase 1.** `cacheComponents` is on because it is the current Next.js default. `GET /api/health` calls `connection()` so the health payload is not frozen at build time. Future aggregate endpoints must not opt into `use cache` until the invalidation story is explicit. Stale intelligence is worse than a slower query at this size.

## Request path

1. The design frontend calls a route under `/api`.
2. The route validates the body with a Zod schema.
3. A server module runs SQL or a pure calculation.
4. The route returns `{ data, meta? }` or `{ error: { code, message } }`.
5. Numbers in that payload come from the database or from a tested function. A later language model may classify a query or write a narrative from that payload. It does not get to invent a count.

## What is deliberately absent

- A landing page, visual system, or chart library.
- Seeded articles or engagement numbers.
- Stub routes that return empty analytics as if they had run.
- A hosted Supabase project. The schema applies to Postgres; linking the project needs credentials that are not in this environment.
