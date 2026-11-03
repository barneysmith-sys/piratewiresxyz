-- First-party audience measurements. These are not social engagement and must not be
-- derived from likes, reposts, or follows.
create table public.audience_observations (
  id uuid primary key default gen_random_uuid(),
  measurement_timestamp timestamptz not null,
  measurement_window text not null,
  window_start timestamptz,
  window_end timestamptz,
  scope text not null,
  article_id uuid references public.articles (id),
  referral_source text,
  retention_cohort text,
  unique_visitors bigint,
  page_views bigint,
  newsletter_signups bigint,
  subscriber_conversions bigint,
  returning_visitors bigint,
  subscription_event_count bigint,
  data_quality text not null,
  data_source_id uuid not null references public.data_sources (id),
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint audience_observations_window_check check (
    measurement_window in ('hour', 'day', 'week', 'trailing_7d', 'trailing_30d', 'custom')
  ),
  constraint audience_observations_custom_window check (
    measurement_window <> 'custom'
    or (window_start is not null and window_end is not null)
  ),
  constraint audience_observations_window_bounds check (
    (window_start is null and window_end is null)
    or (window_start is not null and window_end is not null and window_end > window_start)
  ),
  constraint audience_observations_scope_check check (
    scope in ('site', 'article', 'referral', 'cohort')
  ),
  constraint audience_observations_article_scope check (
    scope <> 'article' or article_id is not null
  ),
  constraint audience_observations_referral_scope check (
    scope <> 'referral' or nullif(btrim(referral_source), '') is not null
  ),
  constraint audience_observations_cohort_scope check (
    scope <> 'cohort' or nullif(btrim(retention_cohort), '') is not null
  ),
  constraint audience_observations_measurement_present check (
    num_nonnulls(
      unique_visitors,
      page_views,
      newsletter_signups,
      subscriber_conversions,
      returning_visitors,
      subscription_event_count
    ) > 0
  ),
  constraint audience_observations_nonnegative check (
    (unique_visitors is null or unique_visitors >= 0)
    and (page_views is null or page_views >= 0)
    and (newsletter_signups is null or newsletter_signups >= 0)
    and (subscriber_conversions is null or subscriber_conversions >= 0)
    and (returning_visitors is null or returning_visitors >= 0)
    and (subscription_event_count is null or subscription_event_count >= 0)
  ),
  constraint audience_observations_quality_check check (
    data_quality in ('observed', 'estimated', 'illustrative', 'incomplete', 'unknown')
  ),
  constraint audience_observations_idempotency unique nulls not distinct (
    measurement_timestamp,
    measurement_window,
    scope,
    article_id,
    referral_source,
    retention_cohort,
    data_source_id
  )
);

create index audience_observations_article_time_idx
  on public.audience_observations (article_id, measurement_timestamp desc)
  where article_id is not null;
create index audience_observations_time_idx
  on public.audience_observations (measurement_timestamp desc, scope);
create index audience_observations_data_source_id_idx
  on public.audience_observations (data_source_id);

create trigger audience_observations_assert_quality
before insert or update on public.audience_observations
for each row
execute function internal.assert_quality_source();

create trigger audience_observations_touch_updated_at
before update on public.audience_observations
for each row
execute function internal.touch_updated_at();

comment on table public.audience_observations is
  'Website and newsletter measurements. subscription_event_count is a count of events in the window, not an event log. Null means the source did not report that measure.';

comment on column public.audience_observations.retention_cohort is
  'The cohort label supplied by the analytics source, such as 2026-W10. It is not calculated by this database.';

create table public.ingestion_batches (
  id uuid primary key default gen_random_uuid(),
  adapter text not null,
  status text not null default 'pending',
  input_fingerprint text,
  data_source_id uuid references public.data_sources (id),
  records_received integer not null default 0,
  records_inserted integer not null default 0,
  records_updated integer not null default 0,
  records_unchanged integer not null default 0,
  records_rejected integer not null default 0,
  summary jsonb,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingestion_batches_adapter_check check (
    adapter in (
      'csv',
      'json',
      'article_metadata',
      'manual_article',
      'social_post',
      'metric_snapshot'
    )
  ),
  constraint ingestion_batches_status_check check (
    status in ('pending', 'running', 'completed', 'completed_with_errors', 'failed')
  ),
  constraint ingestion_batches_counts_check check (
    records_received >= 0
    and records_inserted >= 0
    and records_updated >= 0
    and records_unchanged >= 0
    and records_rejected >= 0
  )
);

create index ingestion_batches_data_source_id_idx
  on public.ingestion_batches (data_source_id);
create index ingestion_batches_status_idx
  on public.ingestion_batches (status, created_at desc);

create trigger ingestion_batches_touch_updated_at
before update on public.ingestion_batches
for each row
execute function internal.touch_updated_at();

create table public.ingestion_rejections (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.ingestion_batches (id) on delete cascade,
  record_index integer,
  entity_type text,
  natural_key text,
  error_code text not null,
  message text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index ingestion_rejections_batch_id_idx
  on public.ingestion_rejections (batch_id);

comment on table public.ingestion_batches is
  'One run of an ingestion adapter. Importing the same fingerprint twice is the adapter''s responsibility; article and metric identities are also enforced in the database.';

create table public.research_requests (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  intent text,
  required_datasets text[] not null default '{}',
  status text not null default 'queued',
  execution_mode text not null default 'analytical',
  error_message text,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_requests_query_not_blank check (char_length(btrim(query)) > 0),
  constraint research_requests_intent_check check (
    intent is null or intent in (
      'article_search',
      'topic_comparison',
      'author_comparison',
      'distribution_analysis',
      'historical_performance',
      'growth_opportunities',
      'general_research'
    )
  ),
  constraint research_requests_status_check check (
    status in ('queued', 'running', 'completed', 'failed', 'cancelled')
  ),
  constraint research_requests_execution_mode_check check (
    execution_mode in ('analytical', 'simulated')
  )
);

create index research_requests_status_idx
  on public.research_requests (status, requested_at desc);

create trigger research_requests_touch_updated_at
before update on public.research_requests
for each row
execute function internal.touch_updated_at();

comment on column public.research_requests.execution_mode is
  'analytical means the stages called the analytical services. simulated is a labeled demo execution and must not be presented as completed research.';

create table public.research_tasks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.research_requests (id) on delete cascade,
  stage text not null,
  stage_order integer not null,
  status text not null default 'queued',
  inputs jsonb not null default '{}'::jsonb,
  outputs jsonb,
  errors jsonb,
  source_references jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_tasks_stage_check check (
    (stage = 'content_discovery' and stage_order = 1)
    or (stage = 'distribution_research' and stage_order = 2)
    or (stage = 'performance_analysis' and stage_order = 3)
    or (stage = 'audience_analysis' and stage_order = 4)
    or (stage = 'strategic_synthesis' and stage_order = 5)
  ),
  constraint research_tasks_status_check check (
    status in ('queued', 'running', 'completed', 'skipped', 'failed')
  ),
  constraint research_tasks_inputs_object check (jsonb_typeof(inputs) = 'object'),
  constraint research_tasks_source_references_array check (jsonb_typeof(source_references) = 'array'),
  constraint research_tasks_request_stage_key unique (request_id, stage)
);

create index research_tasks_request_order_idx
  on public.research_tasks (request_id, stage_order);

create trigger research_tasks_touch_updated_at
before update on public.research_tasks
for each row
execute function internal.touch_updated_at();

comment on table public.research_tasks is
  'One analytical stage. audience_analysis should be skipped, with a recorded reason, when no first-party audience rows exist. It must not invent conversions.';

create table public.research_reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.research_requests (id),
  execution_mode text not null,
  research_question text not null,
  researched_on date not null,
  methodology text not null,
  datasets_examined jsonb not null,
  key_findings jsonb not null,
  supporting_observations jsonb not null,
  article_references jsonb not null,
  visualization_specs jsonb not null default '[]'::jsonb,
  limitations jsonb not null,
  opportunities jsonb not null,
  recommendations jsonb not null,
  created_at timestamptz not null default now(),
  constraint research_reports_execution_mode_check check (
    execution_mode in ('analytical', 'simulated')
  ),
  constraint research_reports_question_not_blank check (char_length(btrim(research_question)) > 0),
  constraint research_reports_methodology_not_blank check (char_length(btrim(methodology)) > 0),
  constraint research_reports_datasets_array check (jsonb_typeof(datasets_examined) = 'array'),
  constraint research_reports_findings_array check (jsonb_typeof(key_findings) = 'array'),
  constraint research_reports_observations_array check (jsonb_typeof(supporting_observations) = 'array'),
  constraint research_reports_articles_array check (jsonb_typeof(article_references) = 'array'),
  constraint research_reports_visualizations_array check (jsonb_typeof(visualization_specs) = 'array'),
  constraint research_reports_limitations_array check (
    jsonb_typeof(limitations) = 'array' and jsonb_array_length(limitations) > 0
  ),
  constraint research_reports_opportunities_array check (jsonb_typeof(opportunities) = 'array'),
  constraint research_reports_recommendations_array check (jsonb_typeof(recommendations) = 'array')
);

create or replace function internal.research_reports_before_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  request_mode text;
begin
  select execution_mode into request_mode
  from public.research_requests
  where id = new.request_id;

  if request_mode is null then
    raise exception 'unknown_research_request';
  end if;

  if new.execution_mode is distinct from request_mode then
    raise exception 'execution_mode_mismatch';
  end if;

  return new;
end;
$function$;

create trigger research_reports_before_write
before insert or update on public.research_reports
for each row
execute function internal.research_reports_before_write();

comment on table public.research_reports is
  'Evidence-backed report. execution_mode is copied from the request and cannot be relabeled. Recommendations are validated by the application schema before insert.';
