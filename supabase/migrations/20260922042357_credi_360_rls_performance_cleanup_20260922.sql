drop policy if exists affiliate_products_select_own on public.affiliate_products;
drop policy if exists affiliate_products_insert_own on public.affiliate_products;
drop policy if exists affiliate_products_update_own on public.affiliate_products;
drop policy if exists affiliate_products_delete_own on public.affiliate_products;
drop policy if exists b2b_awards_buyer_select on public.b2b_awards;

drop index if exists public.affiliate_products_affiliate_product_uq;
drop index if exists public.idx_b2b_awards_quote;

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
