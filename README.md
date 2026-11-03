# PW / INTELLIGENCE

Media intelligence foundation for Pirate Wires. This repository holds the data model, analytical contracts, and API shell. The visual product is being designed separately and will replace the presentation layer without replacing this schema.

Phase 1 is in place: schema, migrations, typed contracts, and integrity tests. Ingestion, calculations, and research orchestration are specified and not yet implemented. No article performance has been invented.

## Run

```bash
npm test
npm run lint
npm run build
```

Apply the schema to a Postgres database once `DIRECT_DATABASE_URL` or `DATABASE_URL` is set:

```bash
npm run db:migrate
```

Use the direct connection for migrations and the transaction pooler for the app. See `.env.example`. Never put these values in a `NEXT_PUBLIC_` variable.

## Where to read

| Document | Contents |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Repository audit, system shape, and the decisions already made |
| [docs/data-model.md](docs/data-model.md) | Entities, keys, and integrity rules |
| [docs/methodology.md](docs/methodology.md) | How metrics will be compared, and which ones are not implemented |
| [docs/collection.md](docs/collection.md) | How real records will be collected |
| [docs/api.md](docs/api.md) | Response envelope and which routes exist |
| [docs/roadmap.md](docs/roadmap.md) | Phases 1–7 |
| [docs/risks.md](docs/risks.md) | Risks and decisions that still deserve a look |

## API

`GET /api` describes the service. `GET /api/health` reports whether the database is configured. It does not return editorial data. The future interface owns `/` and the other pages. Do not add a route handler at `/`.
