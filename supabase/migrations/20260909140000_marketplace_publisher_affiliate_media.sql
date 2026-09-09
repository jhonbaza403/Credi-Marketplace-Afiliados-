-- Marketplace publisher media + per-product affiliate links
-- Applied to the connected production project as marketplace_publisher_affiliate_media.

update storage.buckets
set public = true,
    file_size_limit = 524288000,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
where id = 'marketplace-media';

create table if not exists public.affiliate_product_links (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  code text not null,
  commission_rate_override numeric(7,4),
  clicks bigint not null default 0,
  conversions bigint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affiliate_product_links_code_valid check (code ~ '^[A-Za-z0-9_-]{3,96}$'),
  constraint affiliate_product_links_commission_valid check (commission_rate_override is null or (commission_rate_override >= 0 and commission_rate_override <= 1)),
  constraint affiliate_product_links_unique_pair unique (affiliate_id, product_id),
  constraint affiliate_product_links_code_unique unique (code)
);

create index if not exists idx_affiliate_product_links_affiliate on public.affiliate_product_links(affiliate_id);
create index if not exists idx_affiliate_product_links_product on public.affiliate_product_links(product_id);
create index if not exists idx_affiliate_product_links_active on public.affiliate_product_links(is_active) where is_active = true;

create or replace function public.set_affiliate_product_link_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_affiliate_product_links_updated_at on public.affiliate_product_links;
create trigger trg_affiliate_product_links_updated_at before update on public.affiliate_product_links for each row execute function public.set_affiliate_product_link_updated_at();

alter table public.affiliate_product_links enable row level security;

drop policy if exists affiliate_product_links_owner_select on public.affiliate_product_links;
create policy affiliate_product_links_owner_select on public.affiliate_product_links for select to authenticated using (exists (select 1 from public.affiliates a where a.id = affiliate_product_links.affiliate_id and a.user_id = auth.uid()));

drop policy if exists affiliate_product_links_public_select on public.affiliate_product_links;
create policy affiliate_product_links_public_select on public.affiliate_product_links for select to anon, authenticated using (is_active = true);

drop policy if exists affiliate_product_links_owner_insert on public.affiliate_product_links;
create policy affiliate_product_links_owner_insert on public.affiliate_product_links for insert to authenticated with check (
  exists (select 1 from public.affiliates a where a.id = affiliate_product_links.affiliate_id and a.user_id = auth.uid() and a.is_active = true)
  and exists (select 1 from public.products p join public.stores s on s.id = p.store_id where p.id = affiliate_product_links.product_id and p.is_active = true and s.is_active = true)
);

drop policy if exists affiliate_product_links_owner_update on public.affiliate_product_links;
create policy affiliate_product_links_owner_update on public.affiliate_product_links for update to authenticated using (exists (select 1 from public.affiliates a where a.id = affiliate_product_links.affiliate_id and a.user_id = auth.uid())) with check (exists (select 1 from public.affiliates a where a.id = affiliate_product_links.affiliate_id and a.user_id = auth.uid()));

drop policy if exists affiliate_product_links_owner_delete on public.affiliate_product_links;
create policy affiliate_product_links_owner_delete on public.affiliate_product_links for delete to authenticated using (exists (select 1 from public.affiliates a where a.id = affiliate_product_links.affiliate_id and a.user_id = auth.uid()));
