# PW / INTELLIGENCE

Pirate Wires media intelligence. One Next.js application: the Capitol Hill interface, the article archive, and a research workspace backed by the PostgreSQL schema.

## Hosting

GitHub Pages is not this application's host. The live Pages site, [barneysmith-sys.github.io/piratewiresxyz](https://barneysmith-sys.github.io/piratewiresxyz/), is Jekyll rendering this README from the repository root. Pages never runs Node, never calls the API routes, and never opens PostgreSQL. Do not add a static export to make that URL show a shell of the product.

Deploy on Vercel:

1. Import `barneysmith-sys/piratewiresxyz`. Framework preset: Next.js. Node.js 22. Leave the output directory empty so Vercel runs `next start`, not a static file host.
2. Production branch: `main`, after this branch is merged. Preview deployments can track the pull request.
3. Set the environment variables below. Then run `npm run db:migrate` once from a machine that can reach `DIRECT_DATABASE_URL`.
4. For a demonstration on hosted Postgres, set `SEED_ILLUSTRATIVE=true` for one deployment so the fictional corpus is loaded. Analytical mode still ignores it.

The first request after a cold start applies migrations. On Vercel without `DATABASE_URL`, that database lives in `/tmp` and disappears with the instance.

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

Copy `.env.example` locally, and set the same names in the Vercel project. All of these are server-only.

| Variable | Vercel | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Required for a durable deployment | Runtime connection. Supabase transaction pooler, port 6543. `prepare` is disabled for the pooler. |
| `DIRECT_DATABASE_URL` | Used by `npm run db:migrate`, not by the running app | Direct connection, port 5432. |
| `SEED_ILLUSTRATIVE` | Optional | `true` loads the fictional corpus into that database. The local and `/tmp` sandboxes load it without this flag. |
| `NEXT_PUBLIC_RESEARCH_ENDPOINT` | Leave unset | Override only if research is hosted elsewhere. The default is same-origin `/api/research/stream`. |

Do not put database credentials in a `NEXT_PUBLIC_` variable. There is no client-side Supabase key. Do not set `GITHUB_PAGES` or a static `output: "export"` in Next config.

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
