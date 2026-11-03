-- Source registry. Every editorial and measurement row points here.
create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text,
  name text not null,
  collection_method text not null,
  original_url text,
  original_identifier text,
  permissions text not null,
  collected_at timestamptz,
  freshness text,
  freshness_interval interval,
  validation_status text not null default 'unverified',
  confidence numeric(3, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_sources_name_not_blank check (char_length(btrim(name)) > 0),
  constraint data_sources_collection_method_check check (
    collection_method in (
      'manual_entry',
      'csv_upload',
      'json_import',
      'website_export',
      'platform_api',
      'public_page',
      'illustrative_fixture',
      'other'
    )
  ),
  constraint data_sources_validation_status_check check (
    validation_status in ('unverified', 'validated', 'rejected', 'illustrative')
  ),
  constraint data_sources_confidence_check check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  )
);

create unique index data_sources_source_key_idx
  on public.data_sources (source_key)
  where source_key is not null;

create trigger data_sources_touch_updated_at
before update on public.data_sources
for each row
execute function internal.touch_updated_at();

comment on table public.data_sources is
  'Provenance registry. Illustrative observations must reference a source whose validation_status is illustrative.';

comment on column public.data_sources.collected_at is
  'When the source artifact was produced, if that time is known. Individual rows also store their own collected_at.';

comment on column public.data_sources.permissions is
  'Access basis for this source. Use a concrete description such as "public article page" or "first-party export". Do not leave the legal basis implied.';

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank check (char_length(btrim(name)) > 0)
);

create unique index categories_slug_idx on public.categories (slug);
create unique index categories_name_lower_idx on public.categories (lower(name));

create trigger categories_assign_slug
before insert or update on public.categories
for each row
execute function internal.assign_slug();

create trigger categories_touch_updated_at
before update on public.categories
for each row
execute function internal.touch_updated_at();

create table public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  profile_url text,
  metadata jsonb not null default '{}'::jsonb,
  data_source_id uuid not null references public.data_sources (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authors_name_not_blank check (char_length(btrim(name)) > 0),
  constraint authors_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index authors_slug_idx on public.authors (slug);
create index authors_data_source_id_idx on public.authors (data_source_id);

create trigger authors_assign_slug
before insert or update on public.authors
for each row
execute function internal.assign_slug();

create trigger authors_touch_updated_at
before update on public.authors
for each row
execute function internal.touch_updated_at();

comment on column public.authors.metadata is
  'Author metadata that does not yet deserve a column. Do not store engagement totals here.';

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  canonical_url text not null,
  submitted_url text,
  headline text not null,
  subheadline text,
  publication_timestamp timestamptz,
  category_id uuid references public.categories (id),
  content_type text,
  excerpt text,
  body_text text,
  word_count integer,
  record_status text not null default 'observed',
  data_source_id uuid not null references public.data_sources (id),
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(headline, '')), 'A')
    || setweight(to_tsvector('english', coalesce(subheadline, '')), 'B')
    || setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
    || setweight(to_tsvector('english', coalesce(body_text, '')), 'C')
  ) stored,
  constraint articles_headline_not_blank check (char_length(btrim(headline)) > 0),
  constraint articles_content_type_check check (
    content_type is null or content_type in (
      'essay',
      'news',
      'interview',
      'brief',
      'newsletter',
      'announcement',
      'video',
      'audio',
      'other'
    )
  ),
  constraint articles_word_count_check check (word_count is null or word_count >= 0),
  constraint articles_record_status_check check (record_status in ('observed', 'illustrative')),
  constraint articles_canonical_url_key unique (canonical_url)
);

create index articles_data_source_id_idx on public.articles (data_source_id);
create index articles_category_id_idx on public.articles (category_id);
create index articles_publication_idx
  on public.articles (publication_timestamp desc, id desc)
  where record_status = 'observed';
create index articles_category_publication_idx
  on public.articles (category_id, publication_timestamp desc, id desc)
  where record_status = 'observed';
create index articles_type_publication_idx
  on public.articles (content_type, publication_timestamp desc, id desc)
  where record_status = 'observed' and content_type is not null;
create index articles_search_vector_idx on public.articles using gin (search_vector);

comment on table public.articles is
  'Central editorial entity. canonical_url is the idempotency key. record_status = illustrative is excluded from analytical views.';

comment on column public.articles.canonical_url is
  'Normalized absolute URL. Tracking parameters and fragments are removed. The original submitted string is kept on submitted_url.';

comment on column public.articles.word_count is
  'A provided word count is preserved. When it is null and body_text is present, a whitespace token count is stored as a convenience, not as an editorial standard.';

comment on column public.articles.publication_timestamp is
  'When Pirate Wires published the article. Null means unknown. Age-aligned comparisons must exclude unknown publication times rather than treating them as zero age.';

create or replace function internal.articles_before_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  source_status text;
begin
  if new.submitted_url is null then
    new.submitted_url := new.canonical_url;
  end if;
  new.canonical_url := internal.normalize_url(new.canonical_url);

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  if new.word_count is null and new.body_text is not null and btrim(new.body_text) <> '' then
    new.word_count := cardinality(
      regexp_split_to_array(regexp_replace(btrim(new.body_text), '\s+', ' ', 'g'), ' ')
    );
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

create trigger articles_before_write
before insert or update on public.articles
for each row
execute function internal.articles_before_write();

create trigger articles_prevent_metric_delete
before delete on public.articles
for each row
execute function internal.prevent_delete_with_metrics('article');

-- Null arguments mean "not provided" on update. They do not clear an existing value.
-- Reimporting the same canonical URL updates one row. It never inserts a second article.
create or replace function internal.import_article(
  p_canonical_url text,
  p_headline text,
  p_data_source_id uuid,
  p_subheadline text default null,
  p_publication_timestamp timestamptz default null,
  p_category_id uuid default null,
  p_content_type text default null,
  p_excerpt text default null,
  p_body_text text default null,
  p_word_count integer default null,
  p_submitted_url text default null,
  p_record_status text default null,
  p_collected_at timestamptz default null
) returns public.articles
language plpgsql
set search_path = pg_catalog
as $function$
declare
  existing public.articles;
  result public.articles;
  normalized text;
begin
  if nullif(btrim(p_headline), '') is null then
    raise exception 'invalid_headline';
  end if;

  normalized := internal.normalize_url(p_canonical_url);

  for attempt in 1..2 loop
    select * into existing
    from public.articles
    where canonical_url = normalized;

    if found then
      if existing.data_source_id is distinct from p_data_source_id then
        raise exception 'source_mismatch: article provenance cannot be reassigned';
      end if;
      if p_record_status is not null and p_record_status is distinct from existing.record_status then
        raise exception 'record_status_immutable';
      end if;

      update public.articles
      set
        headline = btrim(p_headline),
        subheadline = coalesce(p_subheadline, subheadline),
        publication_timestamp = coalesce(p_publication_timestamp, publication_timestamp),
        category_id = coalesce(p_category_id, category_id),
        content_type = coalesce(p_content_type, content_type),
        excerpt = coalesce(p_excerpt, excerpt),
        body_text = coalesce(p_body_text, body_text),
        word_count = case
          when p_word_count is not null then p_word_count
          when p_body_text is not null then null
          else word_count
        end
      where id = existing.id
      returning * into result;

      return result;
    end if;

    begin
      insert into public.articles (
        canonical_url,
        submitted_url,
        headline,
        subheadline,
        publication_timestamp,
        category_id,
        content_type,
        excerpt,
        body_text,
        word_count,
        record_status,
        data_source_id,
        collected_at
      ) values (
        p_canonical_url,
        coalesce(p_submitted_url, p_canonical_url),
        btrim(p_headline),
        p_subheadline,
        p_publication_timestamp,
        p_category_id,
        p_content_type,
        p_excerpt,
        p_body_text,
        p_word_count,
        coalesce(p_record_status, 'observed'),
        p_data_source_id,
        coalesce(p_collected_at, now())
      )
      returning * into result;
      return result;
    exception
      when unique_violation then
        if attempt = 2 or sqlerrm not like '%canonical_url%' then
          raise;
        end if;
    end;
  end loop;

  raise exception 'import_article_failed';
end;
$function$;

create table public.article_authors (
  article_id uuid not null references public.articles (id) on delete cascade,
  author_id uuid not null references public.authors (id),
  role text not null,
  position integer not null default 0,
  data_source_id uuid not null references public.data_sources (id),
  created_at timestamptz not null default now(),
  primary key (article_id, author_id),
  constraint article_authors_role_check check (role in ('primary', 'author', 'contributor')),
  constraint article_authors_position_check check (position >= 0)
);

create index article_authors_author_id_idx on public.article_authors (author_id);
create index article_authors_data_source_id_idx on public.article_authors (data_source_id);
create unique index article_authors_one_primary_idx
  on public.article_authors (article_id)
  where role = 'primary';

comment on table public.article_authors is
  'An article may have several authors. At most one row per article has role = primary. Zero primary authors is allowed and must be reported as unknown, not guessed.';

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  topic_name text not null,
  slug text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topics_name_not_blank check (char_length(btrim(topic_name)) > 0)
);

create unique index topics_slug_idx on public.topics (slug);
create unique index topics_name_lower_idx on public.topics (lower(topic_name));

create trigger topics_assign_slug
before insert or update on public.topics
for each row
execute function internal.assign_slug();

create trigger topics_touch_updated_at
before update on public.topics
for each row
execute function internal.touch_updated_at();

comment on table public.topics is
  'Controlled vocabulary. How a topic was assigned to an article lives on article_topics, because the same topic can be manual on one article and model-proposed on another.';

create table public.article_topics (
  article_id uuid not null references public.articles (id) on delete cascade,
  topic_id uuid not null references public.topics (id),
  classification_source text not null,
  confirmation_status text not null,
  confidence numeric(3, 2),
  classifier text,
  assigned_at timestamptz not null default now(),
  confirmed_at timestamptz,
  data_source_id uuid not null references public.data_sources (id),
  primary key (article_id, topic_id),
  constraint article_topics_classification_source_check check (
    classification_source in ('manual', 'model', 'import', 'rule')
  ),
  constraint article_topics_confirmation_status_check check (
    confirmation_status in ('proposed', 'confirmed', 'rejected')
  ),
  constraint article_topics_confidence_check check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  )
);

create index article_topics_topic_id_idx on public.article_topics (topic_id);
create index article_topics_data_source_id_idx on public.article_topics (data_source_id);
create index article_topics_confirmed_idx
  on public.article_topics (topic_id, article_id)
  where confirmation_status = 'confirmed';

comment on column public.article_topics.classification_source is
  'Provenance of this assignment. model assignments should stay confirmation_status = proposed until a person confirms them.';

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_name_not_blank check (char_length(btrim(name)) > 0)
);

create unique index tags_slug_idx on public.tags (slug);
create unique index tags_name_lower_idx on public.tags (lower(name));

create trigger tags_assign_slug
before insert or update on public.tags
for each row
execute function internal.assign_slug();

create trigger tags_touch_updated_at
before update on public.tags
for each row
execute function internal.touch_updated_at();

create table public.article_tags (
  article_id uuid not null references public.articles (id) on delete cascade,
  tag_id uuid not null references public.tags (id),
  data_source_id uuid not null references public.data_sources (id),
  created_at timestamptz not null default now(),
  primary key (article_id, tag_id)
);

create index article_tags_tag_id_idx on public.article_tags (tag_id);
create index article_tags_data_source_id_idx on public.article_tags (data_source_id);

comment on table public.tags is
  'Freeform labels. Topics are the controlled vocabulary used for baselines. Do not treat a tag and a topic as the same thing.';
