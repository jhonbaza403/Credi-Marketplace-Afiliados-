-- Credi 360° hardening: align repository migrations with the live distributed rate limiter,
-- close affiliate_products RLS, and remove anonymous access to sensitive RPCs.

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;

alter table public.affiliate_products enable row level security;

drop policy if exists affiliate_products_select_own on public.affiliate_products;
create policy affiliate_products_select_own on public.affiliate_products
for select to authenticated
using (exists (
  select 1 from public.affiliates a
  where a.id = affiliate_products.affiliate_id and a.user_id = auth.uid()
));

drop policy if exists affiliate_products_insert_own on public.affiliate_products;
create policy affiliate_products_insert_own on public.affiliate_products
for insert to authenticated
with check (exists (
  select 1 from public.affiliates a
  where a.id = affiliate_products.affiliate_id and a.user_id = auth.uid()
));

drop policy if exists affiliate_products_update_own on public.affiliate_products;
create policy affiliate_products_update_own on public.affiliate_products
for update to authenticated
using (exists (
  select 1 from public.affiliates a
  where a.id = affiliate_products.affiliate_id and a.user_id = auth.uid()
))
with check (exists (
  select 1 from public.affiliates a
  where a.id = affiliate_products.affiliate_id and a.user_id = auth.uid()
));

drop policy if exists affiliate_products_delete_own on public.affiliate_products;
create policy affiliate_products_delete_own on public.affiliate_products
for delete to authenticated
using (exists (
  select 1 from public.affiliates a
  where a.id = affiliate_products.affiliate_id and a.user_id = auth.uid()
));

revoke all on function public.create_b2b_award(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.create_b2b_award(uuid, uuid, uuid, uuid) to authenticated;

revoke all on function public.settle_order_inventory(uuid, text) from public, anon;
grant execute on function public.settle_order_inventory(uuid, text) to authenticated;
