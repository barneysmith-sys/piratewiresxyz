-- Private helpers. This schema must stay off the Supabase Data API allow-list.
create schema if not exists internal;

comment on schema internal is
  'Private functions for PW Intelligence. Do not expose this schema through the Supabase API.';

-- Canonical article identity. Tracking parameters and fragments are not part of
-- the identity. The path remains case-sensitive. Normalization is idempotent.
create or replace function internal.normalize_url(raw text)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $function$
declare
  value text := btrim(raw);
  hash_pos integer;
  query_pos integer;
  base text;
  query text;
  pairs text[];
  pair text;
  param_key text;
  kept text[] := '{}'::text[];
  scheme text;
  rest text;
  slash_pos integer;
  host text;
  path text;
begin
  if value is null or value = '' or value ~ '\s' then
    raise exception 'invalid_url: URL is empty or contains whitespace';
  end if;

  hash_pos := position('#' in value);
  if hash_pos > 0 then
    value := substring(value from 1 for hash_pos - 1);
  end if;

  query_pos := position('?' in value);
  if query_pos > 0 then
    base := substring(value from 1 for query_pos - 1);
    query := substring(value from query_pos + 1);
  else
    base := value;
    query := null;
  end if;

  if query is not null and query <> '' then
    pairs := string_to_array(query, '&');
    foreach pair in array pairs loop
      if pair is null or pair = '' then
        continue;
      end if;
      param_key := lower(split_part(pair, '=', 1));
      if param_key ~ '^utm_' or param_key in ('fbclid', 'gclid', 'mc_cid', 'mc_eid', 'igshid') then
        continue;
      end if;
      kept := array_append(kept, pair);
    end loop;
  end if;

  if position('://' in base) = 0 then
    raise exception 'invalid_url: an absolute http(s) URL is required';
  end if;

  scheme := lower(split_part(base, '://', 1));
  if scheme not in ('http', 'https') then
    raise exception 'invalid_url: scheme must be http or https';
  end if;

  rest := substring(base from length(scheme) + 4);
  slash_pos := position('/' in rest);
  if slash_pos = 0 then
    host := rest;
    path := '';
  else
    host := substring(rest from 1 for slash_pos - 1);
    path := substring(rest from slash_pos);
  end if;

  host := regexp_replace(lower(host), '\.$', '');
  if host = '' or position('@' in host) > 0 then
    raise exception 'invalid_url: host is missing or contains credentials';
  end if;

  if position(']' in host) = 0 then
    if scheme = 'http' then
      host := regexp_replace(host, ':80$', '');
    else
      host := regexp_replace(host, ':443$', '');
    end if;
  end if;

  if path = '/' then
    path := '';
  elsif right(path, 1) = '/' then
    path := rtrim(path, '/');
  end if;

  if coalesce(array_length(kept, 1), 0) = 0 then
    return scheme || '://' || host || path;
  end if;

  return scheme || '://' || host || path || '?' || array_to_string(kept, '&');
end;
$function$;

create or replace function internal.slugify(input text)
returns text
language sql
immutable
set search_path = pg_catalog
as $function$
  select nullif(
    trim(both '-' from regexp_replace(lower(btrim(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g')),
    ''
  );
$function$;

create or replace function internal.touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

-- Slug source column: authors, categories, and tags use name. Topics use topic_name.
create or replace function internal.assign_slug()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if new.slug is null or btrim(new.slug) = '' then
    if tg_table_name = 'topics' then
      new.slug := internal.slugify(new.topic_name);
    else
      new.slug := internal.slugify(new.name);
    end if;
  else
    new.slug := internal.slugify(new.slug);
  end if;

  if new.slug is null then
    raise exception 'invalid_slug';
  end if;

  return new;
end;
$function$;

create or replace function internal.assert_record_source()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  source_status text;
begin
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

create or replace function internal.assert_quality_source()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  source_status text;
begin
  select validation_status into source_status
  from public.data_sources
  where id = new.data_source_id;

  if source_status is null then
    raise exception 'unknown_source';
  end if;

  if new.data_quality = 'illustrative' and source_status is distinct from 'illustrative' then
    raise exception 'illustrative_source_required';
  elsif new.data_quality <> 'illustrative' and source_status = 'illustrative' then
    raise exception 'observed_source_required';
  end if;

  return new;
end;
$function$;

-- TG_ARGV[0] is the metric entity_type stored for this relation.
create or replace function internal.prevent_delete_with_metrics()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if exists (
    select 1
    from public.metric_snapshots
    where entity_type = tg_argv[0]
      and entity_id = old.id
  ) then
    raise exception 'metrics_present: delete the metric snapshots deliberately before deleting this record';
  end if;
  return old;
end;
$function$;
