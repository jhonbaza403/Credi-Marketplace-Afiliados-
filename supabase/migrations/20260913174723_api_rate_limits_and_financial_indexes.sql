create table if not exists public.api_rate_limits (
  key text primary key,
  count integer not null default 0,
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;

create index if not exists idx_payment_orchestrations_order_status on public.payment_orchestrations(order_id,status,provider);
create index if not exists idx_payment_orchestrations_provider_reference on public.payment_orchestrations(provider,provider_reference);
create index if not exists idx_orders_buyer_payment_status on public.orders(buyer_id,payment_status,status,created_at desc);
create index if not exists idx_tax_transactions_order on public.tax_transactions(order_id,created_at desc);
create index if not exists idx_tax_transaction_lines_transaction on public.tax_transaction_lines(tax_transaction_id);
create index if not exists idx_settlement_allocations_order on public.settlement_allocations(order_id,created_at desc);

create or replace function public.consume_api_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns table(allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql security definer set search_path to ''
as $$
declare
  v_now timestamptz := now();
  v_row public.api_rate_limits%rowtype;
  v_reset timestamptz;
begin
  if p_key is null or length(btrim(p_key)) = 0 then
    raise exception 'rate_limit_key_required' using errcode='22023';
  end if;
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit_parameters' using errcode='22023';
  end if;
  insert into public.api_rate_limits(key,count,window_started_at,updated_at)
  values (btrim(p_key),1,v_now,v_now)
  on conflict (key) do update
    set count = case when public.api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then 1 else public.api_rate_limits.count + 1 end,
        window_started_at = case when public.api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then v_now else public.api_rate_limits.window_started_at end,
        updated_at = v_now
  returning * into v_row;
  v_reset := v_row.window_started_at + make_interval(secs => p_window_seconds);
  allowed := v_row.count <= p_limit;
  remaining := greatest(0,p_limit-v_row.count);
  reset_at := v_reset;
  return next;
end;
$$;

revoke all on function public.consume_api_rate_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text,integer,integer) to service_role;
