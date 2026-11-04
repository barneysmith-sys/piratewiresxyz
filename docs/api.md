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
| `GET` | `/api/health` | Database status. `sandbox` means the local PGlite store is standing in because `DATABASE_URL` is unset. `up` / `down` describe Postgres. |
| `GET` | `/api/articles?mode=` | `demo` returns the labelled illustrative corpus. `analytical` (the default) returns observed rows only. |
| `GET` | `/api/articles/:id?mode=` | One article visible in that mode, including source name. An illustrative id is not found in analytical mode. |
| `GET` | `/api/analytics/overview?mode=` | Implemented counts. Demo responses are labelled illustrative. Analytical responses do not include the fixture. |
| `GET` | `/api/analytics/topics?mode=` | `topic.article_count` for confirmed topics on observed articles. Demo mode returns an empty count on purpose. |
| `GET` | `/api/analytics/authors?mode=` | Primary-author article counts for the selected mode. |
| `GET` | `/api/analytics/distribution` | Confirmed article/post links. The illustrative channel chart is not included. |
| `GET` | `/api/analytics/performance?mode=` | Stored view totals. Baselines stay null until an age-aligned sample clears the minimum. |
| `POST` | `/api/research` | Runs the five stages, stores the request, tasks and report, and returns the workspace report. |
| `POST` | `/api/research/stream` | The same run as server-sent events for the workspace. |
| `GET` | `/api/research/:id` | Request status and task rows. |
| `GET` | `/api/research/:id/results` | Stored report, limitations, and execution mode. |

`mode=demo` is the explicit switch for illustrative rows. The payload sets `illustrative: true`. Analytical routes never read those rows.

## Specified, not mounted

| Method | Path | Returns |
| --- | --- | --- |
| `POST` | `/api/ingestion/articles` | Validated article batch. Duplicate URLs update. Errors come back per row. |
| `POST` | `/api/ingestion/social-posts` | Posts and article links. Inferred links stay inferred. |
| `POST` | `/api/ingestion/metrics` | Snapshots. Conflicts are rejections, not overwrites. |

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

There is no authentication middleware yet. Demo responses are fictional and labelled. Analytical responses are empty until observed rows are loaded. Do not deploy the data routes on a public URL until staff access control is in place.
