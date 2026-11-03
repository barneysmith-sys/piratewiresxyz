# API

Routes are Next.js route handlers under `src/app/api`. The future design owns `/` and the pages. This service does not put a route handler on `/`.

## Envelope

Success:

```json
{ "data": {}, "meta": { "limit": 20, "nextCursor": null } }
```

`meta` is omitted when the response is not a page.

Failure:

```json
{ "error": { "code": "invalid_request", "message": "Headline is required.", "details": [] } }
```

`details` is omitted when there is nothing structured to add.

Pagination is a cursor over the sort columns plus `id`, with a default limit of 20 and a maximum of 100. Offset pagination is not part of the contract. List routes in Phase 4 will use this shape. Phase 1 has no list route.

## Implemented

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/api` | Static description of the service. No database read. |
| `GET` | `/api/health` | `{ status, database, phase }`. `database` is `unconfigured`, `up`, or `down`. HTTP 503 when the check fails. Does not return rows. Runs on each request. |

## Specified, not mounted

These will be added when the module behind them exists. They are not stubbed, because an empty payload would look like a result.

| Method | Path | Returns |
| --- | --- | --- |
| `GET` | `/api/articles` | Observed articles. Filters: query, author, topic, category, content type, from, to. Sort: publication time or an implemented metric. |
| `GET` | `/api/articles/:id` | The article, authors, confirmed topics, tags, links (confirmation status included), metric history, and audience rows for that article. |
| `GET` | `/api/analytics/overview` | Implemented catalog metrics for a named window, each with sample size. |
| `GET` | `/api/analytics/topics` | Confirmed-topic aggregates. Proposed assignments are not folded in. |
| `GET` | `/api/analytics/authors` | Author aggregates with article counts. |
| `GET` | `/api/analytics/distribution` | Confirmed links by default. `confirmation=inferred` is a separate, labeled response. |
| `GET` | `/api/analytics/performance` | Age-aligned series and baselines. `insufficient_sample` where the rules require it. |
| `POST` | `/api/ingestion/articles` | Validated article batch. Duplicate URLs update. Errors come back per row. |
| `POST` | `/api/ingestion/social-posts` | Posts and article links. Inferred links stay inferred. |
| `POST` | `/api/ingestion/metrics` | Snapshots. Conflicts are rejections, not overwrites. |
| `POST` | `/api/research` | Creates a request in `queued` and records `execution_mode`. |
| `GET` | `/api/research/:id` | Request, task statuses, errors, timestamps. |
| `GET` | `/api/research/:id/results` | The report, including limitations and the execution mode. |

`includeIllustrative=true` is the only way a future route should return illustrative rows, and the payload must say that it did.

## Validation and errors

Request bodies use the Zod schemas in `src/domain/schemas.ts`. Expected codes:

| Code | When |
| --- | --- |
| `invalid_request` | Zod rejection. `details` lists the issues. |
| `not_found` | Unknown id. |
| `conflict` | `snapshot_conflict`, `source_mismatch`, or a duplicate the caller must reconcile. |
| `database_unavailable` | The health check or a query cannot reach Postgres. |
| `not_implemented` | A specified route is called before its module exists. Prefer not mounting it. |

## Access

There is no authentication middleware yet. The mounted routes do not return editorial rows. Do not deploy the data routes on a public URL until staff access control is in place. Rate limits belong on the ingestion and research posts, not on this health check.
