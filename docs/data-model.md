# Data model

The article is the center. Measurements are timestamped observations. Illustrative rows can be stored, and the analytical views refuse to read them.

```text
data_sources
    |
    +-- authors ---- article_authors ---- articles ---- categories
    |                     |                  |
    |                     |                  +-- article_topics -- topics
    |                     |                  +-- article_tags ---- tags
    |                     |
    +-- distribution_accounts -- account_observations
              |
              +-- social_posts -- article_social_posts -- articles
              |
              +-- metric_snapshots (entity_type + entity_id)

audience_observations ---- articles?   (separate from social metrics)

ingestion_batches -- ingestion_rejections
research_requests -- research_tasks
                  -- research_reports
```

## Identity

| Entity | Idempotency key |
| --- | --- |
| Article | Normalized `canonical_url` |
| Author, topic, tag, category | Slug |
| Distribution account | `(platform, account_identifier)` |
| Social post | `(platform, external_post_id)` when present, else `post_url` |
| Metric snapshot | `(entity_type, entity_id, data_source_id, measurement_window, captured_at)` |
| Account observation | `(account_id, observed_at, data_source_id)` |
| Audience observation | Window, scope, article, referral, cohort, source. Nulls are distinct in the usual way and are covered by `UNIQUE NULLS NOT DISTINCT` |
| Data source | Optional `source_key` |

`internal.import_article` updates the same row on a second import. Null arguments mean "not provided" and do not clear a stored value. The original `data_source_id` cannot be reassigned. `record_status` cannot be flipped.

`internal.import_metric_snapshot` returns the existing row when the same observation arrives again. A different non-null measurement raises `snapshot_conflict`. A later import may fill a measurement that was null. It may not replace a number. Corrections are a new `captured_at` or a deliberate edit, not a silent overwrite.

## Deviations from the field list

These are intentional.

**Authors are many-to-many.** `article_authors.role = 'primary'` is unique per article. An article may have no primary author. That is reported as unknown.

**Topic provenance sits on the assignment.** `article_topics.classification_source` is `manual`, `model`, `import`, or `rule`, with `confirmation_status` of `proposed`, `confirmed`, or `rejected`. A topic is a vocabulary entry. The same topic can be confirmed on one article and only proposed on another. Baselines use confirmed assignments.

**Tags are not topics.** Tags are freeform labels. Topics are the controlled set used for comparison.

**Metrics are one table plus a real entity check.** `entity_type` and `entity_id` match the brief. A trigger rejects an id that does not exist. Audience data is not in this table. Follower counts are not in this table. They are different grains and must not be summed together.

**`engagement_rate` is a ratio from 0 to 1.** It is invalid without `engagement_rate_basis` and a positive `engagement_rate_denominator`. `0.034` means 3.4 percent.

**`subscription_event_count` is a count.** The brief's `subscription_events` reads like a log. This column is the count inside the window. An event log can be added later without replacing it.

**Illustrative is a status, not a separate database.** `record_status` or `data_quality` of `illustrative` requires a data source whose `validation_status` is `illustrative`. The reverse is also enforced. Views prefixed `analytical_` and `confirmed_` drop illustrative rows. `confirmed_article_posts` also requires `confirmation_status = 'confirmed'`. `inferred_article_posts` is the labeled inference set.

**`latest_account_observations` is the latest row, not a last-known-value fill.** If the newest observation omitted follower count, the view returns null. It does not copy an older follower count forward.

## Time

| Column | Meaning |
| --- | --- |
| `articles.publication_timestamp` | When Pirate Wires published. Null means unknown. |
| `metric_snapshots.captured_at` | When the measurement was true in the source. |
| `collected_at` | When this system recorded the row. |
| `data_sources.collected_at` | When the source artifact was produced, if known. |

Age-aligned comparisons use `publication_timestamp` and `captured_at`. They exclude articles whose publication time is unknown. They do not treat null as zero.

## Search and access

`articles.search_vector` is a stored `tsvector` over headline, subheadline, excerpt, and body. `internal.search_articles` searches observed articles only. An empty query returns no rows.

Every public table has row level security enabled and forced. There is no `anon` or `authenticated` policy. New tables need `select internal.secure_table('public.<table>'::regclass);` in the same migration that creates them. The schema test fails if a public table is unprotected.

## Indexes

The indexes follow the queries Phase 4 will run: publication time, category plus publication time, content type plus publication time, full text, topic and author foreign keys, post-by-account time, metric history by entity, and partial indexes for observed articles and non-illustrative snapshots. Materialized views are not justified at the sandbox size. Add one when an aggregate is measured and slow, and give it the same illustrative-row exclusion as the views.
