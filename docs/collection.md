# Data collection

Collect the bibliographic record first. Attach a measurement only when a permitted source actually reports it.

## What can be stored

- Canonical URL, headline, deck, byline, publication time, category, tags, excerpt, and body when the page or an export provides them.
- Topic assignments. Manual and imported assignments can be confirmed. Model assignments start as `proposed` and keep `classification_source = model`.
- A public post URL or platform post id, the account it belongs to, and the text we actually captured.
- A relationship between a post and an article. If a person has not confirmed it and the import is not authoritative, `confirmation_status` is `inferred` or `pending`.
- A metric snapshot with `captured_at`, the window, the source, and only the components that source reported.
- First-party audience rows from an export Pirate Wires is allowed to use.

## What this pass did not collect

The public site returned HTTP 429 when this environment requested it. No articles were saved. No engagement numbers were estimated to fill the gap. The database is empty of editorial data on purpose.

## How the first corpus should be built

1. Create one `data_sources` row per collection session. Record the method, the permission (`public article page`, `staff CSV`, or similar), the collection time, and a validation status.
2. Enter 20 to 30 real articles through `internal.import_article` or, in Phase 2, the CSV and JSON adapters. Keep the submitted URL. The database stores the normalized canonical URL.
3. Add authors and confirmed topics from the page, not from a model's guess, unless the guess is stored as `proposed`.
4. Add a social post only when its URL or platform id can be opened. Do not invent an account relationship.
5. Add a snapshot only from a number that was on the source at a known time. Leave the other components null.
6. If a demonstration needs a shape before those rows exist, put it in a source with `validation_status = illustrative`. Analytical views will ignore it. Replace it with observed rows without a schema change.

## Idempotency

Importing the same article URL twice updates one row. Importing the same metric identity twice keeps one snapshot. A second file that disagrees with a stored count is a `snapshot_conflict`, recorded as an ingestion rejection in Phase 2 rather than a quiet overwrite.

## Boundaries

- No unauthenticated scraping and no attempt to bypass a 429, a login, or a platform limit.
- Public likes are not impressions, clicks, readers, or subscribers.
- Follower counts are observations at a time. A missing count stays null.
- Platform API terms and Pirate Wires' own export rights decide whether a source is allowed. The `permissions` column is required so that decision is written down.
