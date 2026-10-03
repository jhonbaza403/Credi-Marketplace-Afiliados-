drop policy if exists affiliate_product_links_owner_insert on public.affiliate_product_links;
create policy affiliate_product_links_owner_insert
on public.affiliate_product_links
for insert to authenticated
with check (
  exists (
    select 1 from public.affiliates a
    where a.id = affiliate_product_links.affiliate_id
      and a.user_id = (select auth.uid())
      and a.is_active = true
  )
);

drop policy if exists affiliate_products_owner_insert on public.affiliate_products;
create policy affiliate_products_owner_insert
on public.affiliate_products
for insert to authenticated
with check (
  exists (
    select 1 from public.affiliates a
    where a.id = affiliate_products.affiliate_id
      and a.user_id = (select auth.uid())
      and a.is_active = true
  )
);

drop policy if exists products_owner_insert on public.products;
create policy products_owner_insert
on public.products
for insert to authenticated
with check (
  exists (
    select 1 from public.stores s
    where s.id = products.store_id
      and (s.vendor_id = (select auth.uid()) or (select is_admin()))
  )
);
