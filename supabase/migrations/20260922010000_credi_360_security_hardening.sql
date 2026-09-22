-- Credi 360° hardening: distributed API rate limiting + affiliate product RLS + safe RPC grants.
create table if not exists public.api_rate_limits (
  key text primary key,
  count integer not null default 0,
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;

revoke all on table public.api_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, count integer, remaining integer, limit integer, reset_at_epoch_ms bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_row public.api_rate_limits;
  v_reset timestamptz;
begin
  if p_key is null or length(trim(p_key)) = 0 then
    raise exception 'rate_limit_key_required';
  end if;
  if p_limit < 1 or p_limit > 100000 then raise exception 'invalid_rate_limit'; end if;
  if p_window_seconds < 1 or p_window_seconds > 86400 then raise exception 'invalid_rate_window'; end if;

  insert into public.api_rate_limits(key,count,window_started_at,updated_at)
  values (left(p_key,512),1,v_now,v_now)
  on conflict (key) do update
  set count = case
      when public.api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then 1
      else public.api_rate_limits.count + 1
    end,
    window_started_at = case
      when public.api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then v_now
      else public.api_rate_limits.window_started_at
    end,
    updated_at = v_now
  returning * into v_row;

  v_reset := v_row.window_started_at + make_interval(secs => p_window_seconds);
  return query select
    v_row.count <= p_limit,
    v_row.count,
    greatest(0,p_limit-v_row.count),
    p_limit,
    (extract(epoch from v_reset)*1000)::bigint;
end;
$$;

revoke all on function public.consume_api_rate_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text,integer,integer) to service_role;

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

-- Two security-definer functions were exposed to anonymous callers in the live database.
revoke all on function public.create_b2b_award(uuid,uuid,uuid,uuid) from public, anon;
grant execute on function public.create_b2b_award(uuid,uuid,uuid,uuid) to authenticated;
revoke all on function public.settle_order_inventory(uuid,text) from public, anon;
grant execute on function public.settle_order_inventory(uuid,text) to authenticated;
