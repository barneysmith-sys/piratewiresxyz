create table public.distribution_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  identifier_kind text not null,
  account_identifier text not null,
  account_name text,
  display_name text,
  profile_url text,
  record_status text not null default 'observed',
  data_source_id uuid not null references public.data_sources (id),
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint distribution_accounts_platform_check check (
    platform in (
      'x',
      'instagram',
      'threads',
      'youtube',
      'tiktok',
      'newsletter',
      'website',
      'other'
    )
  ),
  constraint distribution_accounts_identifier_kind_check check (
    identifier_kind in ('platform_id', 'handle')
  ),
  constraint distribution_accounts_identifier_not_blank check (
    char_length(btrim(account_identifier)) > 0
  ),
  constraint distribution_accounts_record_status_check check (
    record_status in ('observed', 'illustrative')
  ),
  constraint distribution_accounts_identity_key unique (platform, account_identifier)
);

create index distribution_accounts_data_source_id_idx
  on public.distribution_accounts (data_source_id);
create index distribution_accounts_name_idx
  on public.distribution_accounts (platform, lower(account_name))
  where account_name is not null;

create trigger distribution_accounts_assert_source
before insert or update on public.distribution_accounts
for each row
execute function internal.assert_record_source();

create trigger distribution_accounts_touch_updated_at
before update on public.distribution_accounts
for each row
execute function internal.touch_updated_at();

create trigger distribution_accounts_prevent_metric_delete
before delete on public.distribution_accounts
for each row
execute function internal.prevent_delete_with_metrics('distribution_account');

comment on table public.distribution_accounts is
  'Accounts that share, amplify, or publish Pirate Wires content. Follower counts are observations, not columns on this row.';

comment on column public.distribution_accounts.identifier_kind is
  'platform_id is stable. handle is the only identifier we had at collection time and can change. Do not merge accounts because a handle was reused.';

-- Profile observations. A null follower count is unknown, not zero.
create table public.account_observations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.distribution_accounts (id),
  observed_at timestamptz not null,
  follower_count bigint,
  following_count bigint,
  data_quality text not null,
  data_source_id uuid not null references public.data_sources (id),
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_observations_quality_check check (
    data_quality in ('observed', 'estimated', 'illustrative', 'incomplete', 'unknown')
  ),
  constraint account_observations_measurement_present check (
    num_nonnulls(follower_count, following_count) > 0
  ),
  constraint account_observations_nonnegative check (
    (follower_count is null or follower_count >= 0)
    and (following_count is null or following_count >= 0)
  ),
  constraint account_observations_idempotency unique (account_id, observed_at, data_source_id)
);

create index account_observations_account_time_idx
  on public.account_observations (account_id, observed_at desc, collected_at desc, id desc);
create index account_observations_data_source_id_idx
  on public.account_observations (data_source_id);

create trigger account_observations_assert_quality
before insert or update on public.account_observations
for each row
execute function internal.assert_quality_source();

create trigger account_observations_touch_updated_at
before update on public.account_observations
for each row
execute function internal.touch_updated_at();

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  account_id uuid not null references public.distribution_accounts (id),
  external_post_id text,
  post_url text,
  post_text text,
  publication_timestamp timestamptz,
  record_status text not null default 'observed',
  data_source_id uuid not null references public.data_sources (id),
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_posts_platform_check check (
    platform in (
      'x',
      'instagram',
      'threads',
      'youtube',
      'tiktok',
      'newsletter',
      'website',
      'other'
    )
  ),
  constraint social_posts_identity_present check (
    external_post_id is not null or post_url is not null
  ),
  constraint social_posts_record_status_check check (
    record_status in ('observed', 'illustrative')
  )
);

create unique index social_posts_external_idx
  on public.social_posts (platform, external_post_id)
  where external_post_id is not null;

create unique index social_posts_url_idx
  on public.social_posts (post_url)
  where post_url is not null;

create index social_posts_account_time_idx
  on public.social_posts (account_id, publication_timestamp desc, id desc);
create index social_posts_data_source_id_idx on public.social_posts (data_source_id);
create index social_posts_publication_idx
  on public.social_posts (publication_timestamp desc, id desc)
  where record_status = 'observed';

create or replace function internal.social_posts_before_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  account_platform text;
  account_status text;
  source_status text;
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  if new.post_url is not null then
    new.post_url := internal.normalize_url(new.post_url);
  end if;

  select platform, record_status
  into account_platform, account_status
  from public.distribution_accounts
  where id = new.account_id;

  if account_platform is null then
    raise exception 'unknown_account';
  end if;
  if account_platform is distinct from new.platform then
    raise exception 'platform_mismatch';
  end if;
  if new.record_status = 'illustrative' and account_status is distinct from 'illustrative' then
    raise exception 'illustrative_account_required';
  elsif new.record_status <> 'illustrative' and account_status = 'illustrative' then
    raise exception 'observed_account_required';
  end if;

  select validation_status into source_status
  from public.data_sources
  where id = new.data_source_id;

  if source_status is null then
    raise exception 'unknown_source';
  end if;
  if new.record_status = 'illustrative' and source_status is distinct from 'illustrative' then
    raise exception 'illustrative_source_required';
  elsif new.record_status <> 'illustrative' and source_status = 'illustrative' then
    raise exception 'observed_source_required';
  end if;

  return new;
end;
$function$;

create trigger social_posts_before_write
before insert or update on public.social_posts
for each row
execute function internal.social_posts_before_write();

create trigger social_posts_prevent_metric_delete
before delete on public.social_posts
for each row
execute function internal.prevent_delete_with_metrics('social_post');

comment on table public.social_posts is
  'A post may reference several articles through article_social_posts. Identity is the platform post id when we have it, otherwise the post URL.';

create table public.article_social_posts (
  social_post_id uuid not null references public.social_posts (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  relationship_type text not null,
  confirmation_status text not null,
  confidence numeric(3, 2),
  confirmed_at timestamptz,
  confirmed_by text,
  notes text,
  data_source_id uuid not null references public.data_sources (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (social_post_id, article_id),
  constraint article_social_posts_relationship_check check (
    relationship_type in (
      'official_distribution',
      'amplification',
      'mention',
      'quote',
      'reply',
      'unknown'
    )
  ),
  constraint article_social_posts_confirmation_check check (
    confirmation_status in ('confirmed', 'inferred', 'rejected', 'pending')
  ),
  constraint article_social_posts_unknown_not_confirmed check (
    not (relationship_type = 'unknown' and confirmation_status = 'confirmed')
  ),
  constraint article_social_posts_confidence_check check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  )
);

create index article_social_posts_article_id_idx
  on public.article_social_posts (article_id);
create index article_social_posts_data_source_id_idx
  on public.article_social_posts (data_source_id);
create index article_social_posts_confirmed_idx
  on public.article_social_posts (article_id)
  where confirmation_status = 'confirmed';

create trigger article_social_posts_touch_updated_at
before update on public.article_social_posts
for each row
execute function internal.touch_updated_at();

create or replace function internal.article_social_posts_before_write()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if new.confirmation_status = 'confirmed' and new.confirmed_at is null then
    new.confirmed_at := now();
  end if;
  return new;
end;
$function$;

create trigger article_social_posts_before_write
before insert or update on public.article_social_posts
for each row
execute function internal.article_social_posts_before_write();

comment on table public.article_social_posts is
  'Relationship between a post and an article. inferred and pending links stay out of confirmed_article_posts. Confirmation is not implied by a shared URL guess.';

-- Timestamped measurements. Rows are not overwritten when a later import disagrees.
-- engagement_rate is a ratio from 0 to 1, and only with an explicit denominator.
create table public.metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  captured_at timestamptz not null,
  collected_at timestamptz not null default now(),
  measurement_window text not null,
  window_start timestamptz,
  window_end timestamptz,
  impressions bigint,
  views bigint,
  likes bigint,
  reposts bigint,
  replies bigint,
  clicks bigint,
  bookmarks bigint,
  engagement_rate numeric(12, 6),
  engagement_rate_basis text,
  engagement_rate_basis_note text,
  engagement_rate_denominator numeric,
  data_quality text not null,
  data_source_id uuid not null references public.data_sources (id),
  raw_observation jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint metric_snapshots_entity_type_check check (
    entity_type in ('article', 'social_post', 'distribution_account')
  ),
  constraint metric_snapshots_window_check check (
    measurement_window in ('cumulative', '1h', '24h', '7d', '30d', 'calendar_day', 'custom')
  ),
  constraint metric_snapshots_custom_window check (
    measurement_window <> 'custom'
    or (window_start is not null and window_end is not null)
  ),
  constraint metric_snapshots_window_bounds check (
    (window_start is null and window_end is null)
    or (window_start is not null and window_end is not null and window_end > window_start)
  ),
  constraint metric_snapshots_measurement_present check (
    num_nonnulls(
      impressions, views, likes, reposts, replies, clicks, bookmarks, engagement_rate
    ) > 0
  ),
  constraint metric_snapshots_nonnegative check (
    (impressions is null or impressions >= 0)
    and (views is null or views >= 0)
    and (likes is null or likes >= 0)
    and (reposts is null or reposts >= 0)
    and (replies is null or replies >= 0)
    and (clicks is null or clicks >= 0)
    and (bookmarks is null or bookmarks >= 0)
    and (engagement_rate is null or (engagement_rate >= 0 and engagement_rate <= 1))
  ),
  constraint metric_snapshots_rate_basis check (
    (
      engagement_rate is null
      and engagement_rate_basis is null
      and engagement_rate_denominator is null
      and engagement_rate_basis_note is null
    )
    or (
      engagement_rate is not null
      and engagement_rate_basis in ('impressions', 'views', 'followers', 'other')
      and engagement_rate_denominator is not null
      and engagement_rate_denominator > 0
      and (
        engagement_rate_basis <> 'other'
        or nullif(btrim(engagement_rate_basis_note), '') is not null
      )
    )
  ),
  constraint metric_snapshots_quality_check check (
    data_quality in ('observed', 'estimated', 'illustrative', 'incomplete', 'unknown')
  ),
  constraint metric_snapshots_idempotency unique (
    entity_type, entity_id, data_source_id, measurement_window, captured_at
  )
);

create index metric_snapshots_entity_time_idx
  on public.metric_snapshots (entity_type, entity_id, captured_at desc, id desc);
create index metric_snapshots_data_source_id_idx
  on public.metric_snapshots (data_source_id);
create index metric_snapshots_analytical_idx
  on public.metric_snapshots (entity_type, entity_id, captured_at desc)
  where data_quality <> 'illustrative';

create or replace function internal.metric_entity_exists()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  found_entity boolean;
begin
  if new.entity_type = 'article' then
    select exists(select 1 from public.articles where id = new.entity_id) into found_entity;
  elsif new.entity_type = 'social_post' then
    select exists(select 1 from public.social_posts where id = new.entity_id) into found_entity;
  elsif new.entity_type = 'distribution_account' then
    select exists(select 1 from public.distribution_accounts where id = new.entity_id) into found_entity;
  else
    raise exception 'unknown_metric_entity';
  end if;

  if not found_entity then
    raise exception 'unknown_metric_entity';
  end if;

  return new;
end;
$function$;

create trigger metric_snapshots_entity_exists
before insert or update on public.metric_snapshots
for each row
execute function internal.metric_entity_exists();

create trigger metric_snapshots_assert_quality
before insert or update on public.metric_snapshots
for each row
execute function internal.assert_quality_source();

create trigger metric_snapshots_touch_updated_at
before update on public.metric_snapshots
for each row
execute function internal.touch_updated_at();

comment on table public.metric_snapshots is
  'Append-only observations. captured_at is when the measurement was true. collected_at is when we recorded it. A conflicting reimport raises snapshot_conflict instead of overwriting history.';

comment on column public.metric_snapshots.engagement_rate is
  'Ratio from 0 to 1. 0.034 means 3.4 percent. Invalid without engagement_rate_basis and a positive engagement_rate_denominator.';

-- Null measurement arguments mean "not provided".
-- A second import of the same identity keeps the existing row.
-- A non-null value never replaces a different non-null value.
-- A non-null value may fill a previously null measurement.
create or replace function internal.reconcile_metric_snapshot(
  existing public.metric_snapshots,
  p_data_quality text,
  p_impressions bigint,
  p_views bigint,
  p_likes bigint,
  p_reposts bigint,
  p_replies bigint,
  p_clicks bigint,
  p_bookmarks bigint,
  p_engagement_rate numeric,
  p_engagement_rate_basis text,
  p_engagement_rate_basis_note text,
  p_engagement_rate_denominator numeric,
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_raw_observation jsonb
) returns public.metric_snapshots
language plpgsql
set search_path = pg_catalog
as $function$
declare
  result public.metric_snapshots;
begin
  if existing.data_quality is distinct from p_data_quality
    or (existing.impressions is not null and p_impressions is not null and existing.impressions is distinct from p_impressions)
    or (existing.views is not null and p_views is not null and existing.views is distinct from p_views)
    or (existing.likes is not null and p_likes is not null and existing.likes is distinct from p_likes)
    or (existing.reposts is not null and p_reposts is not null and existing.reposts is distinct from p_reposts)
    or (existing.replies is not null and p_replies is not null and existing.replies is distinct from p_replies)
    or (existing.clicks is not null and p_clicks is not null and existing.clicks is distinct from p_clicks)
    or (existing.bookmarks is not null and p_bookmarks is not null and existing.bookmarks is distinct from p_bookmarks)
    or (existing.engagement_rate is not null and p_engagement_rate is not null and existing.engagement_rate is distinct from p_engagement_rate)
    or (existing.engagement_rate_basis is not null and p_engagement_rate_basis is not null and existing.engagement_rate_basis is distinct from p_engagement_rate_basis)
    or (existing.engagement_rate_basis_note is not null and p_engagement_rate_basis_note is not null and existing.engagement_rate_basis_note is distinct from p_engagement_rate_basis_note)
    or (existing.engagement_rate_denominator is not null and p_engagement_rate_denominator is not null and existing.engagement_rate_denominator is distinct from p_engagement_rate_denominator)
    or (existing.window_start is not null and p_window_start is not null and existing.window_start is distinct from p_window_start)
    or (existing.window_end is not null and p_window_end is not null and existing.window_end is distinct from p_window_end)
    or (
      p_raw_observation is not null
      and existing.raw_observation is not null
      and existing.raw_observation is distinct from p_raw_observation
    )
  then
    raise exception 'snapshot_conflict: an observation with this identity already exists and the measurements differ';
  end if;

  if existing.impressions is not distinct from coalesce(existing.impressions, p_impressions)
    and existing.views is not distinct from coalesce(existing.views, p_views)
    and existing.likes is not distinct from coalesce(existing.likes, p_likes)
    and existing.reposts is not distinct from coalesce(existing.reposts, p_reposts)
    and existing.replies is not distinct from coalesce(existing.replies, p_replies)
    and existing.clicks is not distinct from coalesce(existing.clicks, p_clicks)
    and existing.bookmarks is not distinct from coalesce(existing.bookmarks, p_bookmarks)
    and existing.engagement_rate is not distinct from coalesce(existing.engagement_rate, p_engagement_rate)
    and existing.engagement_rate_basis is not distinct from coalesce(existing.engagement_rate_basis, p_engagement_rate_basis)
    and existing.engagement_rate_basis_note is not distinct from coalesce(existing.engagement_rate_basis_note, p_engagement_rate_basis_note)
    and existing.engagement_rate_denominator is not distinct from coalesce(existing.engagement_rate_denominator, p_engagement_rate_denominator)
    and existing.window_start is not distinct from coalesce(existing.window_start, p_window_start)
    and existing.window_end is not distinct from coalesce(existing.window_end, p_window_end)
    and existing.raw_observation is not distinct from coalesce(existing.raw_observation, p_raw_observation)
  then
    return existing;
  end if;

  update public.metric_snapshots
  set
    impressions = coalesce(impressions, p_impressions),
    views = coalesce(views, p_views),
    likes = coalesce(likes, p_likes),
    reposts = coalesce(reposts, p_reposts),
    replies = coalesce(replies, p_replies),
    clicks = coalesce(clicks, p_clicks),
    bookmarks = coalesce(bookmarks, p_bookmarks),
    engagement_rate = coalesce(engagement_rate, p_engagement_rate),
    engagement_rate_basis = coalesce(engagement_rate_basis, p_engagement_rate_basis),
    engagement_rate_basis_note = coalesce(engagement_rate_basis_note, p_engagement_rate_basis_note),
    engagement_rate_denominator = coalesce(engagement_rate_denominator, p_engagement_rate_denominator),
    window_start = coalesce(window_start, p_window_start),
    window_end = coalesce(window_end, p_window_end),
    raw_observation = coalesce(raw_observation, p_raw_observation)
  where id = existing.id
  returning * into result;

  return result;
end;
$function$;

create or replace function internal.import_metric_snapshot(
  p_entity_type text,
  p_entity_id uuid,
  p_captured_at timestamptz,
  p_measurement_window text,
  p_data_source_id uuid,
  p_data_quality text,
  p_impressions bigint default null,
  p_views bigint default null,
  p_likes bigint default null,
  p_reposts bigint default null,
  p_replies bigint default null,
  p_clicks bigint default null,
  p_bookmarks bigint default null,
  p_engagement_rate numeric default null,
  p_engagement_rate_basis text default null,
  p_engagement_rate_basis_note text default null,
  p_engagement_rate_denominator numeric default null,
  p_window_start timestamptz default null,
  p_window_end timestamptz default null,
  p_collected_at timestamptz default null,
  p_raw_observation jsonb default null
) returns public.metric_snapshots
language plpgsql
set search_path = pg_catalog
as $function$
declare
  existing public.metric_snapshots;
  result public.metric_snapshots;
begin
  for attempt in 1..2 loop
    select * into existing
    from public.metric_snapshots
    where entity_type = p_entity_type
      and entity_id = p_entity_id
      and data_source_id = p_data_source_id
      and measurement_window = p_measurement_window
      and captured_at = p_captured_at;

    if found then
      return internal.reconcile_metric_snapshot(
        existing,
        p_data_quality,
        p_impressions,
        p_views,
        p_likes,
        p_reposts,
        p_replies,
        p_clicks,
        p_bookmarks,
        p_engagement_rate,
        p_engagement_rate_basis,
        p_engagement_rate_basis_note,
        p_engagement_rate_denominator,
        p_window_start,
        p_window_end,
        p_raw_observation
      );
    end if;

    if num_nonnulls(
      p_impressions, p_views, p_likes, p_reposts, p_replies, p_clicks, p_bookmarks, p_engagement_rate
    ) = 0 then
      raise exception 'snapshot_empty';
    end if;

    begin
      insert into public.metric_snapshots (
        entity_type,
        entity_id,
        captured_at,
        collected_at,
        measurement_window,
        window_start,
        window_end,
        impressions,
        views,
        likes,
        reposts,
        replies,
        clicks,
        bookmarks,
        engagement_rate,
        engagement_rate_basis,
        engagement_rate_basis_note,
        engagement_rate_denominator,
        data_quality,
        data_source_id,
        raw_observation
      ) values (
        p_entity_type,
        p_entity_id,
        p_captured_at,
        coalesce(p_collected_at, now()),
        p_measurement_window,
        p_window_start,
        p_window_end,
        p_impressions,
        p_views,
        p_likes,
        p_reposts,
        p_replies,
        p_clicks,
        p_bookmarks,
        p_engagement_rate,
        p_engagement_rate_basis,
        p_engagement_rate_basis_note,
        p_engagement_rate_denominator,
        p_data_quality,
        p_data_source_id,
        p_raw_observation
      )
      returning * into result;
      return result;
    exception
      when unique_violation then
        if attempt = 2 then
          raise;
        end if;
    end;
  end loop;

  raise exception 'import_metric_snapshot_failed';
end;
$function$;
