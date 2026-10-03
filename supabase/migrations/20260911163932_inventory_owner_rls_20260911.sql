drop policy if exists inventory_owner_select on public.inventory;
drop policy if exists inventory_owner_insert on public.inventory;
drop policy if exists inventory_owner_update on public.inventory;
drop policy if exists inventory_owner_delete on public.inventory;

create policy inventory_owner_select on public.inventory
for select using (
  exists (
    select 1 from public.products p
    join public.stores s on s.id = p.store_id
    where p.id = inventory.product_id and s.vendor_id = auth.uid()
  )
);

create policy inventory_owner_insert on public.inventory
for insert with check (
  exists (
    select 1 from public.products p
    join public.stores s on s.id = p.store_id
    where p.id = inventory.product_id and s.vendor_id = auth.uid()
  )
);

create policy inventory_owner_update on public.inventory
for update using (
  exists (
    select 1 from public.products p
    join public.stores s on s.id = p.store_id
    where p.id = inventory.product_id and s.vendor_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.products p
    join public.stores s on s.id = p.store_id
    where p.id = inventory.product_id and s.vendor_id = auth.uid()
  )
);

create policy inventory_owner_delete on public.inventory
for delete using (
  exists (
    select 1 from public.products p
    join public.stores s on s.id = p.store_id
    where p.id = inventory.product_id and s.vendor_id = auth.uid()
  )
);
