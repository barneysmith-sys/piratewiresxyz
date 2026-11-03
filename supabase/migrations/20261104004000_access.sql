-- Read models for analysis. Illustrative rows and unconfirmed inferences are excluded.
-- security_invoker keeps the underlying table policies in force.

create view public.analytical_articles
with (security_invoker = true) as
select *
from public.articles
where record_status = 'observed';

comment on view public.analytical_articles is
  'Default article read model. Illustrative records are excluded.';

create view public.analytical_metric_snapshots
with (security_invoker = true) as
select snapshot.*
from public.metric_snapshots as snapshot
join public.articles as article
  on snapshot.entity_type = 'article'
 and article.id = snapshot.entity_id
where snapshot.data_quality <> 'illustrative'
  and article.record_status = 'observed'
union all
select snapshot.*
from public.metric_snapshots as snapshot
join public.social_posts as post
  on snapshot.entity_type = 'social_post'
 and post.id = snapshot.entity_id
where snapshot.data_quality <> 'illustrative'
  and post.record_status = 'observed'
union all
select snapshot.*
from public.metric_snapshots as snapshot
join public.distribution_accounts as account
  on snapshot.entity_type = 'distribution_account'
 and account.id = snapshot.entity_id
where snapshot.data_quality <> 'illustrative'
  and account.record_status = 'observed';

comment on view public.analytical_metric_snapshots is
  'Metric snapshots that may be used in calculations. Illustrative measurements and measurements of illustrative entities are excluded.';

create view public.analytical_audience_observations
with (security_invoker = true) as
select observation.*
from public.audience_observations as observation
left join public.articles as article on article.id = observation.article_id
where observation.data_quality <> 'illustrative'
  and (observation.article_id is null or article.record_status = 'observed');

comment on view public.analytical_audience_observations is
  'First-party audience rows safe to analyze. Social metrics never appear in this view.';

create view public.analytical_article_posts
with (security_invoker = true) as
select link.*
from public.article_social_posts as link
join public.articles as article on article.id = link.article_id
join public.social_posts as post on post.id = link.social_post_id
where article.record_status = 'observed'
  and post.record_status = 'observed'
  and link.confirmation_status <> 'rejected';

comment on view public.analytical_article_posts is
  'Observed article/post links that have not been rejected. confirmation_status is still on the row. Inferred links are not confirmed.';

create view public.confirmed_article_posts
with (security_invoker = true) as
select *
from public.analytical_article_posts
where confirmation_status = 'confirmed';

comment on view public.confirmed_article_posts is
  'Article/post links a person or an authoritative import confirmed. Distribution claims that require a real relationship use this view.';

create view public.inferred_article_posts
with (security_invoker = true) as
select *
from public.analytical_article_posts
where confirmation_status = 'inferred';

comment on view public.inferred_article_posts is
  'Links that are explicitly inferences. They must be labeled as such in any finding.';

create view public.latest_account_observations
with (security_invoker = true) as
select distinct on (observation.account_id)
  observation.*
from public.account_observations as observation
join public.distribution_accounts as account on account.id = observation.account_id
where observation.data_quality <> 'illustrative'
  and account.record_status = 'observed'
order by observation.account_id, observation.observed_at desc, observation.collected_at desc, observation.id desc;

comment on view public.latest_account_observations is
  'Latest non-illustrative follower observation per observed account. Absence from this view means unknown, not zero.';

create or replace function internal.search_articles(search_query text, result_limit integer default 20)
returns setof public.articles
language sql
stable
set search_path = pg_catalog
as $function$
  select article.*
  from public.articles as article
  where article.record_status = 'observed'
    and nullif(btrim(coalesce(search_query, '')), '') is not null
    and article.search_vector @@ websearch_to_tsquery('english', search_query)
  order by
    ts_rank(article.search_vector, websearch_to_tsquery('english', search_query)) desc,
    article.publication_timestamp desc nulls last,
    article.id desc
  limit least(greatest(coalesce(result_limit, 20), 1), 100);
$function$;

comment on function internal.search_articles(text, integer) is
  'Full-text search over observed articles. An empty query returns no rows. Illustrative articles are excluded.';

create or replace function internal.secure_table(target regclass)
returns void
language plpgsql
set search_path = pg_catalog
as $function$
begin
  execute format('alter table %s enable row level security', target);
  execute format('alter table %s force row level security', target);
  execute format('revoke all on table %s from public', target);

  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute format('revoke all on table %s from anon', target);
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute format('revoke all on table %s from authenticated', target);
  end if;
end;
$function$;

select internal.secure_table('public.data_sources'::regclass);
select internal.secure_table('public.categories'::regclass);
select internal.secure_table('public.authors'::regclass);
select internal.secure_table('public.articles'::regclass);
select internal.secure_table('public.article_authors'::regclass);
select internal.secure_table('public.topics'::regclass);
select internal.secure_table('public.article_topics'::regclass);
select internal.secure_table('public.tags'::regclass);
select internal.secure_table('public.article_tags'::regclass);
select internal.secure_table('public.distribution_accounts'::regclass);
select internal.secure_table('public.account_observations'::regclass);
select internal.secure_table('public.social_posts'::regclass);
select internal.secure_table('public.article_social_posts'::regclass);
select internal.secure_table('public.metric_snapshots'::regclass);
select internal.secure_table('public.audience_observations'::regclass);
select internal.secure_table('public.ingestion_batches'::regclass);
select internal.secure_table('public.ingestion_rejections'::regclass);
select internal.secure_table('public.research_requests'::regclass);
select internal.secure_table('public.research_tasks'::regclass);
select internal.secure_table('public.research_reports'::regclass);

do $revoke_views$
declare
  view_name text;
begin
  for view_name in
    select c.relname
    from pg_class as c
    join pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'v'
  loop
    execute format('revoke all on table public.%I from public', view_name);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table public.%I from anon', view_name);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on table public.%I from authenticated', view_name);
    end if;
  end loop;
end
$revoke_views$;

-- The server connects as a role that bypasses RLS. The browser does not.
-- There is intentionally no policy for anon or authenticated. No policy means no rows.
do $service_role_grants$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema internal to service_role;
    grant execute on all functions in schema internal to service_role;
    alter default privileges in schema internal
      grant execute on functions to service_role;
  end if;
end
$service_role_grants$;

revoke all on schema internal from public;
revoke all on all functions in schema internal from public;
