-- PriceDekho initial schema
-- Monetary values are stored as integer paise (1 INR = 100 paise).
-- All exposed tables have Row Level Security enabled. Public roles (anon,
-- authenticated) get read-only access to published catalog data and to a
-- safe subset of offer columns. Writes are reserved for the service role,
-- which bypasses RLS and is only used by server-only code.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------

create type public.offer_availability as enum (
  'in_stock', 'limited', 'out_of_stock', 'preorder', 'unknown'
);

-- 'demo' rows are sample data and must never be presented as live prices.
create type public.offer_source as enum (
  'demo', 'affiliate_api', 'partner_feed', 'licensed_data', 'manual'
);

create type public.refresh_status as enum ('never', 'ok', 'error');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 300),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  brand text,
  model text,
  -- Global trade item number (GTIN/EAN/UPC) when known. Used for matching.
  gtin text check (gtin is null or gtin ~ '^[0-9]{8,14}$'),
  description text,
  image_url text,
  specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications) = 'object'),
  -- Normalised variant attributes, e.g. {"storage": "128gb", "color": "midnight"}.
  variant_attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(variant_attributes) = 'object'),
  -- Deterministic key derived from variant_attributes by the application.
  variant_key text not null default '',
  is_demo boolean not null default false,
  published boolean not null default true,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(brand, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(model, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  website_url text not null check (website_url ~ '^https://'),
  logo_url text,
  is_demo boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete restrict,
  -- Identifier of the provider integration that maintains this listing.
  provider_id text not null,
  external_product_id text,
  variant_key text not null default '',
  product_url text not null check (product_url ~ '^https://'),
  seller_name text,
  price_paise bigint not null check (price_paise > 0),
  original_price_paise bigint check (original_price_paise is null or original_price_paise > 0),
  availability public.offer_availability not null default 'unknown',
  currency char(3) not null default 'INR' check (currency = 'INR'),
  source public.offer_source not null,
  -- Time of the last successful verification by the provider. Never set
  -- merely because cached data was read.
  last_checked_at timestamptz,
  -- Refresh bookkeeping. Error details are internal and not granted to public roles.
  refresh_status public.refresh_status not null default 'never',
  last_refresh_attempt_at timestamptz,
  last_refresh_error text,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A URL identifies at most one listing per store.
  constraint offers_store_url_unique unique (store_id, product_url)
);

-- Retailer listing identity. Partial so that offers without an external id
-- never collide with each other.
create unique index offers_store_external_variant_unique
  on public.offers (store_id, external_product_id, variant_key)
  where external_product_id is not null;

create table public.price_history (
  id bigint generated always as identity primary key,
  offer_id uuid not null references public.offers (id) on delete cascade,
  price_paise bigint not null check (price_paise > 0),
  availability public.offer_availability not null,
  observed_at timestamptz not null default now(),
  -- Makes retried refresh writes idempotent.
  constraint price_history_offer_observed_unique unique (offer_id, observed_at)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index products_category_idx on public.products (category_id) where published;
create index products_brand_idx on public.products (lower(brand));
create index products_brand_model_idx on public.products (lower(brand), lower(model));
create unique index products_gtin_unique on public.products (gtin) where gtin is not null;
create index products_search_idx on public.products using gin (search_vector);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);
create index products_variant_attributes_idx on public.products using gin (variant_attributes jsonb_path_ops);
create index offers_product_idx on public.offers (product_id) where active;
create index offers_store_idx on public.offers (store_id);
create index offers_refresh_queue_idx on public.offers (last_refresh_attempt_at nulls first) where active;
create index price_history_offer_observed_idx on public.price_history (offer_id, observed_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger offers_set_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.stores enable row level security;
alter table public.offers enable row level security;
alter table public.price_history enable row level security;

-- Start from zero privileges for public roles, then grant reads explicitly.
revoke all on public.categories, public.products, public.stores, public.offers, public.price_history
  from anon, authenticated;

grant select on public.categories, public.products, public.stores to anon, authenticated;

-- Column-level grant: refresh errors and bookkeeping stay private.
grant select (
  id, product_id, store_id, provider_id, external_product_id, variant_key, product_url,
  seller_name, price_paise, original_price_paise, availability, currency, source,
  last_checked_at, refresh_status, active, created_at, updated_at
) on public.offers to anon, authenticated;

grant select on public.price_history to anon, authenticated;

create policy "Published categories are readable"
  on public.categories for select to anon, authenticated
  using (published);

create policy "Published products are readable"
  on public.products for select to anon, authenticated
  using (
    published and exists (
      select 1 from public.categories c where c.id = category_id and c.published
    )
  );

create policy "Active stores are readable"
  on public.stores for select to anon, authenticated
  using (active);

create policy "Active offers for published products are readable"
  on public.offers for select to anon, authenticated
  using (
    active
    and exists (select 1 from public.products p where p.id = product_id and p.published)
    and exists (select 1 from public.stores s where s.id = store_id and s.active)
  );

create policy "History of readable offers is readable"
  on public.price_history for select to anon, authenticated
  using (exists (select 1 from public.offers o where o.id = offer_id));

-- No insert/update/delete policies exist, so public roles cannot write even
-- if a grant were added by mistake.

-- ---------------------------------------------------------------------------
-- Search functions (SECURITY INVOKER: callers' RLS applies)
-- ---------------------------------------------------------------------------

create function public.escape_like(value text) returns text
language sql immutable set search_path = '' as $$
  select replace(replace(replace(value, '\', '\\'), '%', '\%'), '_', '\_');
$$;

create function public.search_products(
  p_query text default null,
  p_category_slug text default null,
  p_brand text default null,
  p_attributes jsonb default '{}'::jsonb,
  p_sort text default 'relevance',
  p_limit integer default 12,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  name text,
  brand text,
  model text,
  image_url text,
  variant_attributes jsonb,
  is_demo boolean,
  category_slug text,
  category_name text,
  lowest_price_paise bigint,
  offer_count integer,
  has_demo_offers boolean,
  total_count bigint
)
language sql stable security invoker set search_path = '' as $$
  with params as (
    select
      nullif(btrim(p_query), '') as q,
      case when nullif(btrim(p_query), '') is null then null
           else websearch_to_tsquery('simple', btrim(p_query)) end as tsq,
      least(greatest(coalesce(p_limit, 12), 1), 48) as lim,
      least(greatest(coalesce(p_offset, 0), 0), 10000) as off
  ),
  matched as (
    select
      p.*,
      c.slug as category_slug,
      c.name as category_name,
      case when params.tsq is null then 0
           else ts_rank(p.search_vector, params.tsq) end as rank
    from public.products p
    join public.categories c on c.id = p.category_id
    cross join params
    where (p_category_slug is null or c.slug = p_category_slug)
      and (p_brand is null or lower(p.brand) = lower(p_brand))
      and (p_attributes is null or p.variant_attributes @> p_attributes)
      and (
        params.q is null
        or p.search_vector @@ params.tsq
        or p.name ilike '%' || public.escape_like(params.q) || '%' escape '\'
      )
  ),
  priced as (
    select
      m.*,
      (select min(o.price_paise) from public.offers o
        where o.product_id = m.id and o.active and o.availability <> 'out_of_stock') as lowest_price_paise,
      (select count(*)::integer from public.offers o where o.product_id = m.id and o.active) as offer_count,
      (select bool_or(o.source = 'demo') from public.offers o where o.product_id = m.id and o.active) as has_demo_offers
    from matched m
  )
  select
    pr.id, pr.slug, pr.name, pr.brand, pr.model, pr.image_url, pr.variant_attributes, pr.is_demo,
    pr.category_slug, pr.category_name, pr.lowest_price_paise, pr.offer_count,
    coalesce(pr.has_demo_offers, false), count(*) over () as total_count
  from priced pr, params
  order by
    case when p_sort = 'price_asc' then pr.lowest_price_paise end asc nulls last,
    case when p_sort = 'price_desc' then pr.lowest_price_paise end desc nulls last,
    case when p_sort = 'name' then pr.name end asc,
    pr.rank desc,
    pr.name asc
  limit (select lim from params) offset (select off from params);
$$;

create function public.search_facets(
  p_query text default null,
  p_category_slug text default null
)
returns table (facet text, value text, product_count bigint)
language sql stable security invoker set search_path = '' as $$
  with matched as (
    select p.brand, p.variant_attributes
    from public.products p
    join public.categories c on c.id = p.category_id
    where (p_category_slug is null or c.slug = p_category_slug)
      and (
        nullif(btrim(p_query), '') is null
        or p.search_vector @@ websearch_to_tsquery('simple', btrim(p_query))
        or p.name ilike '%' || public.escape_like(btrim(p_query)) || '%' escape '\'
      )
  )
  select 'brand', brand, count(*) from matched where brand is not null group by brand
  union all
  select kv.key, kv.value, count(*)
  from matched m, jsonb_each_text(m.variant_attributes) kv
  group by kv.key, kv.value
  order by 1, 2;
$$;

grant execute on function public.search_products(text, text, text, jsonb, text, integer, integer) to anon, authenticated;
grant execute on function public.search_facets(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Privileged refresh write (service role only)
-- Applies an offer update and an optional history observation atomically.
-- ---------------------------------------------------------------------------

create function public.apply_offer_refresh(
  p_offer_id uuid,
  p_price_paise bigint,
  p_original_price_paise bigint,
  p_availability public.offer_availability,
  p_seller_name text,
  p_checked_at timestamptz,
  p_record_history boolean
) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.offers set
    price_paise = p_price_paise,
    original_price_paise = p_original_price_paise,
    availability = p_availability,
    seller_name = coalesce(p_seller_name, seller_name),
    last_checked_at = p_checked_at,
    last_refresh_attempt_at = p_checked_at,
    refresh_status = 'ok',
    last_refresh_error = null,
    consecutive_failures = 0
  where id = p_offer_id;

  if not found then
    raise exception 'offer % not found', p_offer_id;
  end if;

  if p_record_history then
    insert into public.price_history (offer_id, price_paise, availability, observed_at)
    values (p_offer_id, p_price_paise, p_availability, p_checked_at)
    on conflict (offer_id, observed_at) do nothing;
  end if;
end;
$$;

revoke all on function public.apply_offer_refresh(uuid, bigint, bigint, public.offer_availability, text, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.apply_offer_refresh(uuid, bigint, bigint, public.offer_availability, text, timestamptz, boolean)
  to service_role;

-- Records a failed refresh attempt. The last valid price and last_checked_at
-- are deliberately left untouched.
create function public.record_offer_refresh_failure(
  p_offer_id uuid,
  p_attempted_at timestamptz,
  p_message text
) returns void
language sql security invoker set search_path = '' as $$
  update public.offers set
    refresh_status = 'error',
    last_refresh_attempt_at = p_attempted_at,
    last_refresh_error = left(p_message, 500),
    consecutive_failures = consecutive_failures + 1
  where id = p_offer_id;
$$;

-- Latest history observation for each of the given offers (one query, no N+1).
create function public.latest_price_observations(p_offer_ids uuid[])
returns table (offer_id uuid, price_paise bigint, availability public.offer_availability, observed_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select distinct on (h.offer_id) h.offer_id, h.price_paise, h.availability, h.observed_at
  from public.price_history h
  where h.offer_id = any(p_offer_ids)
  order by h.offer_id, h.observed_at desc;
$$;

revoke all on function public.record_offer_refresh_failure(uuid, timestamptz, text) from public, anon, authenticated;
revoke all on function public.latest_price_observations(uuid[]) from public, anon, authenticated;
grant execute on function public.record_offer_refresh_failure(uuid, timestamptz, text) to service_role;
grant execute on function public.latest_price_observations(uuid[]) to service_role;
