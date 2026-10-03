do $$ begin
  if not exists (select 1 from pg_constraint where conname='negotiations_bounds_valid') then
    alter table public.negotiations add constraint negotiations_bounds_valid check (buyer_max_price is null or seller_min_price is null or seller_min_price <= buyer_max_price);
  end if;
end $$;
