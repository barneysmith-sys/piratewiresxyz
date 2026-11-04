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

Not done, and not claimed: a hosted Supabase project or real Pirate Wires articles.

The interface, the labelled illustrative corpus, `topic.article_count`, and research orchestration now run in this app. Ingestion batches and the rest of the metric catalog are still open. Analytical mode stays empty until observed rows exist.

## Phase 2 — Ingestion

CSV, JSON, manual article creation, social posts, and metric snapshots. Adapters call `internal.import_article` and `internal.import_metric_snapshot`. Rejections land in `ingestion_rejections`. The same file twice does not create a second article or a second snapshot.

## Phase 3 — Analytics

`topic.article_count` is implemented: confirmed topics on observed articles, with a hand-checked test. Illustrative assignments do not enter it. The remaining catalog entries stay `specified`. Lifetime view totals are described and are not treated as an age-aligned baseline.

## Phase 4 — API

Article, analytics, and research routes are mounted and use the response envelope. List responses carry `limit` and `nextCursor`. Ingestion routes are still unmounted.

## Phase 5 — Research orchestration

A request, five task rows, and a report are stored. Audience analysis is skipped, and that skip is stored, when no first-party audience rows exist. Demo runs are `execution_mode = simulated` and labelled in the workspace. No language model is called.

## Phase 6 — Design integration

Done for the supplied Claude handoff. The Capitol scene, archive, article sheet, and research workspace are the design's components. The untouched handoff is in `design-handoff/claude-piratewires-intelligence/`. Components read the API. They do not recalculate metrics.

## Phase 7 — Demonstration

Load the real 20–30 article corpus, or show an empty state if a source is still blocked. Walk a research question through to a report that links back to articles. Run the test suite. Do not present illustrative rows as Pirate Wires performance.
