# Risks and open decisions

## Decisions already made

| Decision | Why |
| --- | --- |
| Server-side SQL, no browser Supabase client | The service role must not ship to the client. One API keeps the metric definitions in one place. |
| SQL migrations, not an ORM schema | The integrity rules are SQL. A second schema would drift. |
| TypeScript for calculations, Python later | No batch job exists yet. A Python worker can share this database when a job needs it. |
| Illustrative rows in the same tables | A demo can be replaced by observed rows without a migration. Views exclude them by default. |
| No seed data | The public site returned 429. Filling in performance would make the sandbox dishonest. |
| UUIDs | Stable public ids on every current Supabase project. Volume does not justify a custom UUIDv7 extension yet. |
| Percentile baselines, minimum samples of 5 and 8 | Engagement is skewed and the first corpus is small. These are defaults, not findings. |

## Worth confirming

1. **Supabase project.** This environment cannot authenticate the Supabase connection, and the Vercel CLI is not available. Phase 1 does not need a hosted database to test the schema. Applying it to the real project needs a connection string or an authenticated Supabase session. I did not create a project on your behalf.
2. **Python.** Say if you want a Python package in the repo before there is a job for it. I would still keep the metric definitions in one place rather than splitting them across languages.
3. **Baseline thresholds.** Five articles for a baseline and eight for an outlier are deliberately strict. If you would rather show a baseline with a warning at three articles, that is a one-line change to `analyticalRules` before Phase 3 implements it.
4. **Authentication.** Staff login is not built. The only live routes are a static index and a health check. Data routes should wait for an access-control decision: Supabase Auth with a role in `app_metadata`, or Vercel deployment protection in front of the whole sandbox. I would not use `user_metadata` for authorization.
5. **Who may confirm an inferred link.** The column `confirmed_by` is text until there is a user id to store.

## Technical risks

- **Transaction pooler and migrations.** Migrations should use `DIRECT_DATABASE_URL`. The app client disables prepared statements so the transaction pooler on port 6543 can serve it. The migration CLI holds a single connection for the same reason.
- **Security-definer triggers.** They run as the migration owner so a restricted insert can still be validated. They live in `internal`, which is not exposed. Do not copy them into `public`, and do not grant `EXECUTE` on the import functions to `anon`.
- **Full text search is English.** Headlines in another language will stem poorly. That is acceptable for this publication and wrong to ignore if the corpus changes.
- **`search_vector` includes the body.** Fine for a few dozen articles. A very large body column would be a reason to stop generating the vector in the table and maintain a bounded document instead.
- **Latest follower view does not carry values forward.** A dashboard that treats null as "lost followers" would be misreading it. The API should say unknown.
- **Cache Components can freeze a GET handler** that does not touch request data. Health avoids that with `connection()`. Aggregate routes need the same discipline.
- **No auth on the service.** Low risk while the database is empty and the routes return no rows. It becomes the first problem to close before real exports are loaded.
