-- Listing offers RLS cleanup applied to live Supabase.
-- Remote migration version: 20260909002800

begin;

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
