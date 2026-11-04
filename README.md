# PW / INTELLIGENCE

Pirate Wires media intelligence. One Next.js application: the Capitol Hill interface, the article archive, and a research workspace backed by the PostgreSQL schema.

Demo mode shows a labelled illustrative corpus. Those records are fictional and are stored with `record_status = illustrative`. Analytical mode reads observed rows only. If none are loaded, the archive and the research report say so. Missing measurements are left blank.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no `DATABASE_URL`, the server creates a local Postgres-compatible sandbox at `data/sandbox`, applies `supabase/migrations`, and loads the illustrative corpus. That directory is gitignored.

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm start
```

## Environment

Copy `.env.example` when you have a hosted database. Both variables are server-only.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | No | App connection. Supabase transaction pooler, port 6543. When unset, the local sandbox is used. |
| `DIRECT_DATABASE_URL` | No | Migrations via `npm run db:migrate`. Direct connection, port 5432. |
| `SEED_ILLUSTRATIVE` | No | Set to `true` to load the fictional corpus into a hosted database. The sandbox loads it automatically. |
| `NEXT_PUBLIC_RESEARCH_ENDPOINT` | No | Override the research stream. The default is same-origin `/api/research/stream`. |

Do not put database credentials in a `NEXT_PUBLIC_` variable. There is no client-side Supabase key.

## What works without external credentials

- Capitol Hill particle scene, search, and the scroll into the archive
- Demo archive, filters, article detail, and a server-side research run over the labelled corpus
- Analytical mode, which stays empty until observed rows exist
- Confirmed-topic article counts (`topic.article_count`)
- Research requests, five stage rows, and a stored report

## What still needs a source

- A hosted Supabase project, if you do not want the local sandbox
- Real Pirate Wires articles, metric exports, and first-party audience data
- Ingestion routes for CSV and JSON batches
- Age-aligned baselines, engagement rate, and distribution reach. Those catalog entries stay specified until the measurements exist
- Staff authentication before any of this is exposed on a public URL

The original Claude Design handoff is preserved, unmodified, at `design-handoff/claude-piratewires-intelligence/`.
