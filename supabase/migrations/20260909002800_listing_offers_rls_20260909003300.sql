begin;

-- Restore the commerce base tables from the verified Production/Preview schema.
-- These tables were present in both hosted databases but their original CREATE TABLE
-- statements were absent from the tracked migration catalog. IF NOT EXISTS preserves
-- existing hosted data and makes a fresh local reset reproducible.

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  listing_type text not null default 'product'
    constraint listings_type_valid check (listing_type in ('product','service','property','vehicle','classified')),
  status text not null default 'draft'
    constraint listings_status_valid check (status in ('draft','pending_review','published','paused','sold','expired','rejected','archived')),
  title text not null,
  description text not null,
  category_slug text not null,
  subcategory_slug text,
  condition text not null default 'new'
    constraint listings_condition_valid check (condition in ('new','used','refurbished','open_box','not_applicable')),
  price_amount numeric(20,4)
    constraint listings_price_valid check (price_amount is null or price_amount >= 0),
  currency char(3) not null default 'USD'
    constraint listings_currency_valid check (currency ~ '^[A-Z]{3}drop policy if exists listing_offers_owner_all on public.listing_offers;
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
),
  quantity numeric(20,4) not null default 1
    constraint listings_quantity_valid check (quantity > 0),
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
  updated_at timestamptz not null default now(),
  video_media jsonb not null default '[]'::jsonb,
  compliance_country char(2),
  moderation_status text not null default 'pending'
    constraint listings_moderation_status_check check (moderation_status in ('pending','approved','rejected','blocked')),
  constraint listings_dates_valid check (expires_at is null or published_at is null or expires_at > published_at)
);

create index if not exists idx_listings_category_status
  on public.listings(category_slug, status);
create index if not exists idx_listings_published_at
  on public.listings(published_at desc) where status = 'published';
create index if not exists idx_listings_seller_status
  on public.listings(seller_id, status);

create table if not exists public.listing_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  offer_price numeric(20,4) not null
    constraint listing_offers_price_valid check (offer_price >= 0),
  currency char(3) not null default 'USD'
    constraint listing_offers_currency_valid check (currency ~ '^[A-Z]{3}drop policy if exists listing_offers_owner_all on public.listing_offers;
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
),
  original_price numeric(20,4)
    constraint listing_offers_original_price_valid check (original_price is null or original_price >= offer_price),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'scheduled'
    constraint listing_offers_status_valid check (status in ('scheduled','active','paused','expired','cancelled')),
  max_quantity numeric(20,4)
    constraint listing_offers_quantity_valid check (max_quantity is null or max_quantity > 0),
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listing_offers_dates_valid check (ends_at > starts_at)
);

create index if not exists idx_listing_offers_active
  on public.listing_offers(status, starts_at, ends_at);
create index if not exists idx_listing_offers_listing
  on public.listing_offers(listing_id, starts_at desc);
create index if not exists idx_listing_offers_seller
  on public.listing_offers(seller_id);

alter table public.listings enable row level security;
alter table public.listing_offers enable row level security;
grant select, insert, update, delete on public.listings, public.listing_offers to anon, authenticated;
grant all on public.listings, public.listing_offers to service_role;
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
