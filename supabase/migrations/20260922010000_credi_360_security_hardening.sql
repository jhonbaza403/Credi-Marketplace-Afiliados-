-- Credi 360° security hardening.
-- This migration is intentionally idempotent and records the final desired state.

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;

alter table public.affiliate_products enable row level security;

drop policy if exists affiliate_products_select_own on public.affiliate_products;
drop policy if exists affiliate_products_insert_own on public.affiliate_products;
drop policy if exists affiliate_products_update_own on public.affiliate_products;
drop policy if exists affiliate_products_delete_own on public.affiliate_products;

drop policy if exists affiliate_products_owner_select on public.affiliate_products;
create policy affiliate_products_owner_select on public.affiliate_products
for select to authenticated
using (exists (
  select 1 from public.affiliates a
  where a.id=affiliate_products.affiliate_id
    and a.user_id=(select auth.uid())
));

drop policy if exists affiliate_products_owner_insert on public.affiliate_products;
create policy affiliate_products_owner_insert on public.affiliate_products
for insert to authenticated
with check (exists (
  select 1 from public.affiliates a
  where a.id=affiliate_products.affiliate_id
    and a.user_id=(select auth.uid())
    and a.is_active=true
));

drop policy if exists affiliate_products_owner_update on public.affiliate_products;
create policy affiliate_products_owner_update on public.affiliate_products
for update to authenticated
using (exists (
  select 1 from public.affiliates a
  where a.id=affiliate_products.affiliate_id
    and a.user_id=(select auth.uid())
))
with check (exists (
  select 1 from public.affiliates a
  where a.id=affiliate_products.affiliate_id
    and a.user_id=(select auth.uid())
));

drop policy if exists affiliate_products_owner_delete on public.affiliate_products;
create policy affiliate_products_owner_delete on public.affiliate_products
for delete to authenticated
using (exists (
  select 1 from public.affiliates a
  where a.id=affiliate_products.affiliate_id
    and a.user_id=(select auth.uid())
));

drop policy if exists b2b_awards_buyer_select on public.b2b_awards;

drop index if exists public.affiliate_products_affiliate_product_uq;
drop index if exists public.idx_b2b_awards_quote;

revoke all on function public.create_b2b_award(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.create_b2b_award(uuid, uuid, uuid, uuid) to authenticated;
alter function public.create_b2b_award(uuid, uuid, uuid, uuid) set search_path=public;

revoke all on function public.settle_order_inventory(uuid, text) from public, anon;
grant execute on function public.settle_order_inventory(uuid, text) to authenticated;


-- SECURITY DEFINER hardening: never include pg_temp in privileged search_path.
alter function public.create_pending_b2b_order(uuid, uuid, text) set search_path = public;
