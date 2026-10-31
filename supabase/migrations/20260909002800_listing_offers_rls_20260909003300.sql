begin;

-- The core listings relation was present in production but missing from
-- the repository's clean-install migration chain. Rebuild its production shape.
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  listing_type text not null default 'product'
    check (listing_type in ('product','service','property','vehicle','classified')),
  status text not null default 'draft'
    check (status in ('draft','pending_review','published','paused','sold','expired','rejected','archived')),
  title text not null,
  description text not null,
  category_slug text not null,
  subcategory_slug text,
  condition text not null default 'new'
    check (condition in ('new','used','refurbished','open_box','not_applicable')),
  price_amount numeric check (price_amount is null or price_amount >= 0),
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  quantity numeric not null default 1 check (quantity > 0),
  location_country char(2),
  location_region text,
  location_city text,
  attributes jsonb not null default '{}'::jsonb,
  media jsonb not null default '[]'::jsonb,
  shipping_options jsonb not null default '[]'::jsonb,
  service_options jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_seller_created_idx
  on public.listings(seller_id, created_at desc);
create index if not exists listings_status_published_idx
  on public.listings(status, published_at desc);

alter table public.listings enable row level security;

drop policy if exists listings_owner_insert on public.listings;
create policy listings_owner_insert on public.listings for insert to authenticated
with check (seller_id = (select auth.uid()) or (select is_admin()));
drop policy if exists listings_owner_update on public.listings;
create policy listings_owner_update on public.listings for update to authenticated
using (seller_id = (select auth.uid()) or (select is_admin()))
with check (seller_id = (select auth.uid()) or (select is_admin()));
drop policy if exists listings_owner_delete on public.listings;
create policy listings_owner_delete on public.listings for delete to authenticated
using (seller_id = (select auth.uid()) or (select is_admin()));

-- Reconstruct the base relation used by the policy migration. The production
-- schema already has this shape; the historical create-table migration was
-- absent from the repository, which made clean Preview databases fail.
create table if not exists public.listing_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  offer_price numeric not null check (offer_price >= 0),
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  original_price numeric,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled','active','paused','expired','cancelled')),
  max_quantity numeric check (max_quantity is null or max_quantity > 0),
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_offers_listing_status_idx
  on public.listing_offers(listing_id, status, ends_at desc);
create index if not exists listing_offers_seller_created_idx
  on public.listing_offers(seller_id, created_at desc);

alter table public.listing_offers enable row level security;

drop policy if exists listing_offers_owner_all on public.listing_offers;
drop policy if exists listing_offers_public_read on public.listing_offers;
create policy listing_offers_select_visible on public.listing_offers
for select to anon, authenticated
using (
  (status = 'active' and starts_at <= now() and ends_at > now())
  or (
    (select auth.uid()) is not null
    and (seller_id = (select auth.uid()) or (select is_admin()))
  )
);
create policy listing_offers_owner_insert on public.listing_offers
for insert to authenticated
with check (seller_id = (select auth.uid()) or (select is_admin()));
create policy listing_offers_owner_update on public.listing_offers
for update to authenticated
using (seller_id = (select auth.uid()) or (select is_admin()))
with check (seller_id = (select auth.uid()) or (select is_admin()));
create policy listing_offers_owner_delete on public.listing_offers
for delete to authenticated
using (seller_id = (select auth.uid()) or (select is_admin()));
commit;
