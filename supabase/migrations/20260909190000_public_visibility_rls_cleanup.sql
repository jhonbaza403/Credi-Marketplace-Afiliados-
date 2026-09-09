-- Consolidate public visibility policies so moderation status is respected while owners/admins retain access.

drop policy if exists "advertisements_public_select" on public.advertisements;
drop policy if exists "advertisements_select_active_or_own" on public.advertisements;
create policy "advertisements_select_visible_or_own"
on public.advertisements
for select
to anon, authenticated
using (
  (
    status = 'active'
    and moderation_status = 'approved'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  )
  or owner_id = (select auth.uid())
  or (select is_admin())
);

drop policy if exists "feed_posts_public_select" on public.feed_posts;
drop policy if exists "feed_posts_select_public_or_own" on public.feed_posts;
create policy "feed_posts_select_visible_or_own"
on public.feed_posts
for select
to anon, authenticated
using (
  (
    visibility = 'public'
    and status = 'published'
    and moderation_status = 'approved'
  )
  or owner_id = (select auth.uid())
  or (select is_admin())
);

drop policy if exists "reels_public_select" on public.reels;
drop policy if exists "reels_select_public_or_own" on public.reels;
create policy "reels_select_visible_or_own"
on public.reels
for select
to anon, authenticated
using (
  (
    visibility = 'public'
    and status = 'published'
    and moderation_status = 'approved'
  )
  or owner_id = (select auth.uid())
  or (select is_admin())
);

drop policy if exists "listings_select_visible" on public.listings;
create policy "listings_select_visible_or_own"
on public.listings
for select
to anon, authenticated
using (
  (
    status = 'published'
    and moderation_status = 'approved'
  )
  or seller_id = (select auth.uid())
  or (select is_admin())
);

-- Internal affiliate-link metrics are not exposed through the public table policy.
drop policy if exists "affiliate_product_links_public_select" on public.affiliate_product_links;

-- Keep click-tracking RPC callable by visitors, but lock its function search_path.
alter function public.record_affiliate_product_click(uuid) set search_path = public;
revoke execute on function public.record_affiliate_product_click(uuid) from public;
grant execute on function public.record_affiliate_product_click(uuid) to anon, authenticated;
