# Roadmap

## Phase 1 — Foundation

Done in this change.

- Repository audit.
- Postgres schema, views, triggers, and privileged import functions.
- Migration runner and `.env.example`.
- Domain enums, Zod contracts, and the metric catalog.
- URL normalization shared by tests and `internal.normalize_url`.
- `GET /api` and `GET /api/health`.
- Schema tests on embedded Postgres, plus contract tests.

Not done, and not claimed: a hosted Supabase project, editorial rows, or a visual interface.

## Phase 2 — Ingestion

CSV, JSON, manual article creation, social posts, and metric snapshots. Adapters call `internal.import_article` and `internal.import_metric_snapshot`. Rejections land in `ingestion_rejections`. The same file twice does not create a second article or a second snapshot.

## Phase 3 — Analytics

Implement the catalog one metric at a time. Each implementation flips that entry from `specified` to `implemented` and adds a test with a fixture whose result can be checked by hand. Queries read the analytical views. They accept an explicit illustrative flag only for demos.

## Phase 4 — API

Mount the routes in `docs/api.md`. Cursor pagination. Validation errors use the envelope. Every aggregate response includes the ids needed to open the underlying articles and snapshots.

## Phase 5 — Research orchestration

Persist a request, run the five stages, and store task inputs, outputs, errors, and source references. Skip audience analysis when `audience_observations` has no analytical rows, and write that skip down. Synthesis may call a language model only with the structured findings. The report's execution mode is copied from the request. Simulated execution has to be labeled and is not a substitute for the stages.

## Phase 6 — Design integration

Replace nothing in the visual design. Add pages where the design files say they go. Point them at the routes. Do not recalculate metrics in components.

## Phase 7 — Demonstration

Load the real 20–30 article corpus, or show an empty state if a source is still blocked. Walk a research question through to a report that links back to articles. Run the test suite. Do not present illustrative rows as Pirate Wires performance.
