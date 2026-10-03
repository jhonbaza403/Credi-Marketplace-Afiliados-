begin;

create table if not exists public.b2b_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null,
  wholesale_price_usd numeric(14,2) not null check (wholesale_price_usd > 0),
  regular_price_usd numeric(14,2) not null check (regular_price_usd > 0),
  min_order_quantity integer not null default 1 check (min_order_quantity > 0),
  stock_available integer not null default 0 check (stock_available >= 0),
  binance_pay_id text,
  usdt_wallet_address text,
  image_url text,
  video_media jsonb not null default '[]'::jsonb,
  description text not null,
  country char(2),
  status text not null default 'pending_review' check (status in ('draft','pending_review','published','paused','rejected','archived')),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint b2b_products_price_order check (wholesale_price_usd < regular_price_usd),
  constraint b2b_products_country check (country is null or country ~ '^[A-Z]{2}$'),
  constraint b2b_products_video_array check (jsonb_typeof(video_media) = 'array')
);

alter table public.b2b_products enable row level security;
drop policy if exists "b2b_products_public_select" on public.b2b_products;
create policy "b2b_products_public_select" on public.b2b_products for select to anon, authenticated using (status = 'published' and moderation_status = 'approved');
drop policy if exists "b2b_products_owner_select" on public.b2b_products;
create policy "b2b_products_owner_select" on public.b2b_products for select to authenticated using ((select auth.uid()) = supplier_id);
drop policy if exists "b2b_products_owner_insert" on public.b2b_products;
create policy "b2b_products_owner_insert" on public.b2b_products for insert to authenticated with check ((select auth.uid()) = supplier_id);
drop policy if exists "b2b_products_owner_update" on public.b2b_products;
create policy "b2b_products_owner_update" on public.b2b_products for update to authenticated using ((select auth.uid()) = supplier_id) with check ((select auth.uid()) = supplier_id);
create index if not exists b2b_products_public_idx on public.b2b_products(status, moderation_status, created_at desc);
create index if not exists b2b_products_supplier_idx on public.b2b_products(supplier_id, created_at desc);

drop policy if exists "affiliate_products_owner_select" on public.affiliate_products;
create policy "affiliate_products_owner_select" on public.affiliate_products for select to authenticated using (exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = (select auth.uid())));
drop policy if exists "affiliate_products_owner_insert" on public.affiliate_products;
create policy "affiliate_products_owner_insert" on public.affiliate_products for insert to authenticated with check (exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = (select auth.uid())));
drop policy if exists "affiliate_products_owner_update" on public.affiliate_products;
create policy "affiliate_products_owner_update" on public.affiliate_products for update to authenticated using (exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = (select auth.uid()))) with check (exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = (select auth.uid())));
alter table public.affiliate_products alter column referral_code set default lower(encode(gen_random_bytes(9), 'hex'));

drop policy if exists "feed_posts_public_select" on public.feed_posts;
create policy "feed_posts_public_select" on public.feed_posts for select to anon, authenticated using (visibility = 'public' and status = 'published' and moderation_status = 'approved');
drop policy if exists "stories_public_select" on public.stories;
create policy "stories_public_select" on public.stories for select to anon, authenticated using (visibility = 'public' and moderation_status = 'approved' and expires_at > now());
drop policy if exists "reels_public_select" on public.reels;
create policy "reels_public_select" on public.reels for select to anon, authenticated using (visibility = 'public' and status = 'published' and moderation_status = 'approved');
drop policy if exists "advertisements_public_select" on public.advertisements;
create policy "advertisements_public_select" on public.advertisements for select to anon, authenticated using (status = 'active' and moderation_status = 'approved' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));

drop policy if exists "feed_posts_owner_insert" on public.feed_posts;
create policy "feed_posts_owner_insert" on public.feed_posts for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "feed_posts_owner_update" on public.feed_posts;
create policy "feed_posts_owner_update" on public.feed_posts for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "stories_owner_insert" on public.stories;
create policy "stories_owner_insert" on public.stories for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "stories_owner_update" on public.stories;
create policy "stories_owner_update" on public.stories for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "reels_owner_insert" on public.reels;
create policy "reels_owner_insert" on public.reels for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "reels_owner_update" on public.reels;
create policy "reels_owner_update" on public.reels for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "advertisements_owner_insert" on public.advertisements;
create policy "advertisements_owner_insert" on public.advertisements for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "advertisements_owner_update" on public.advertisements;
create policy "advertisements_owner_update" on public.advertisements for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

commit;
