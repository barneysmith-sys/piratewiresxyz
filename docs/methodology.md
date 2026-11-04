# Analytical methodology

The catalog in `src/domain/metrics.ts` is the list of calculations. Every entry is `specified`. None is `implemented`. A test fails if that changes without an explicit update. Until a function exists and is tested, the API must not return the number.

## Claim types

| Type | Meaning |
| --- | --- |
| `observed_fact` | A stored row. A headline, a captured like count, a confirmed link. |
| `calculated_metric` | A number produced by a named function from those rows. |
| `estimate` | A number that fills a gap, labeled with the assumption. |
| `inference` | A relationship the system proposed. `confirmation_status = inferred` is this, not a fact. |
| `hypothesis` | A possible explanation or opportunity. It cites the observation that prompted it. |
| `recommendation` | A proposed experiment. It includes what to test and how to tell whether it worked. |

A finding needs at least one evidence reference. A recommendation needs the observation, the evidence, why it might matter, the experiment, and the measurement plan. A report needs at least one limitation. These are enforced by Zod before a report is stored. The database also refuses a report whose `execution_mode` disagrees with its research request, so a simulated run cannot be relabeled as analytical.

## Comparison rules

Defaults live in `analyticalRules`. They should be revised when real distributions exist. They are conservative on purpose.

- **Null is not zero.** A missing impression count is unknown.
- **Like with like.** Sum likes with likes. Do not add likes to impressions, views, or follower counts.
- **Name the comparison set.** A baseline is the distribution of one component across observed articles that share a category or a confirmed topic, and a content type when one is known.
- **Align on age.** Compare the latest cumulative snapshot with `captured_at` at or before publication plus the window, and at or after publication. A six-month total is not compared with a two-hour total.
- **Minimum samples.** No baseline below 5 articles. No outlier call below 8.
- **Outliers are percentiles.** At or above the 90th percentile of the comparison set, or at or below the 10th. Engagement is skewed. A z-score is not the default.
- **Median is the summary.** The mean can be shown next to it. One viral article moves the mean and does not move the median.
- **Confirmed topics only** in topic baselines. Proposed model labels stay out until someone confirms them.
- **Confirmed links only** in claims about who amplified a story. Inferred links can be shown, labeled as inferences.
- **Association is not causation.** Distribution activity beside article performance is a paired observation. It is not an effect.
- **No audience math from social counts.** Signups, conversions, and retention come from `audience_observations` or they are absent. If that table is empty, audience analysis is `skipped` with that reason.

## Velocity

Velocity is the change in one cumulative component between two snapshots of the same entity, divided by the elapsed hours. It is null when either snapshot is missing, when the component was null, or when publication time is unknown. Early velocity is only compared with other articles at a similar age.

## What a result must carry

Every calculated response should be able to name:

- the metric id from the catalog
- the comparison set and the window
- the sample size
- the rows a person can open to see why the aggregate exists

If the sample is too small, the result says `insufficient_sample`. It does not substitute a story.

## Opportunities

The opportunity signals in the catalog are hypotheses. Thin coverage is not an opportunity by itself. Thin coverage plus a high age-aligned median, with the minimum sample, is a hypothesis worth an editorial test. The test needs a measurement plan that uses the same window and the same component, so the result can be compared with the observation that prompted it.
