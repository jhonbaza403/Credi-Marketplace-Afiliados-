create extension if not exists pgcrypto;

alter table public.orders
  add column if not exists tax_engine_status text not null default 'not_configured',
  add column if not exists tax_snapshot jsonb not null default '{}'::jsonb;

alter table public.tax_transactions
  add column if not exists calculation_status text not null default 'not_configured';

create unique index if not exists ux_tax_transactions_order_id_source
  on public.tax_transactions(order_id, source_type)
  where order_id is not null;

create table if not exists public.settlement_allocations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  tax_transaction_id uuid references public.tax_transactions(id) on delete restrict,
  beneficiary_id uuid,
  beneficiary_role text not null,
  gross_amount numeric(20,6) not null default 0,
  tax_amount numeric(20,6) not null default 0,
  commission_amount numeric(20,6) not null default 0,
  withholding_amount numeric(20,6) not null default 0,
  net_amount numeric(20,6) not null default 0,
  currency char(3) not null,
  status text not null default 'pending',
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, beneficiary_role)
);

create index if not exists ix_settlement_allocations_order on public.settlement_allocations(order_id);

insert into public.tax_categories(code,name,description,active)
values ('generic','Generic / not classified','Fallback category used until a jurisdiction-specific tax category is configured.',true)
on conflict (code) do nothing;

insert into public.tax_jurisdictions(country_code,jurisdiction_code,name,timezone,currency,active,metadata)
values ('ZZ','NOT_CONFIGURED','Tax jurisdiction not configured','UTC','USD',true,jsonb_build_object('system',true,'safe_default',true))
on conflict (country_code,jurisdiction_code) do nothing;

create or replace function public.initialize_order_tax_transaction(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_order public.orders%rowtype;
  v_seller uuid;
  v_tax_id uuid;
  v_jurisdiction uuid;
  v_category uuid;
  v_snapshot jsonb;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  select s.vendor_id into v_seller
  from public.order_items oi
  join public.stores s on s.id = oi.store_id
  where oi.order_id = p_order_id
  order by oi.created_at asc
  limit 1;

  select id into v_jurisdiction from public.tax_jurisdictions
  where jurisdiction_code = 'NOT_CONFIGURED' and country_code = 'ZZ' and active = true
  limit 1;

  select id into v_category from public.tax_categories where code='generic' and active=true limit 1;

  v_snapshot := jsonb_build_object(
    'engine_version','1.0.0',
    'calculation_status','not_configured',
    'merchant_model',coalesce(v_order.notes->>'merchant_model','marketplace_intermediary'),
    'order_id',v_order.id,
    'buyer_id',v_order.buyer_id,
    'seller_id',v_seller,
    'region',v_order.region,
    'jurisdiction_code','NOT_CONFIGURED',
    'jurisdiction_country','ZZ',
    'tax_category_code','generic',
    'gross_amount',v_order.total_amount,
    'taxable_amount',0,
    'tax_amount',0,
    'currency',trim(v_order.currency::text),
    'snapshot_at',now(),
    'reason','No verified jurisdiction-specific tax rule is configured; no tax is asserted by the engine.'
  );

  insert into public.tax_transactions(
    order_id,buyer_id,seller_id,affiliate_id,jurisdiction_id,taxpayer_role,tax_period,currency,
    gross_amount,taxable_amount,tax_amount,status,snapshot,source_type,source_reference,
    merchant_model,rule_version,calculation_status
  ) values (
    v_order.id,v_order.buyer_id,v_seller,v_order.affiliate_id,v_jurisdiction,
    'seller',to_char(coalesce(v_order.created_at,now()),'YYYY-MM'),trim(v_order.currency::text),
    v_order.total_amount,0,0,'calculated',v_snapshot,'order',v_order.id::text,
    'marketplace_intermediary','1.0.0','not_configured'
  )
  on conflict (order_id,source_type) where order_id is not null
  do update set snapshot=excluded.snapshot, updated_at=now()
  returning id into v_tax_id;

  update public.orders
    set tax_engine_status='not_configured',
        tax_snapshot=v_snapshot,
        tax_amount=0,
        updated_at=now()
  where id=p_order_id;

  return v_tax_id;
end;
$$;

create or replace function public.finalize_order_settlement_allocations(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_order public.orders%rowtype;
  v_tax public.tax_transactions%rowtype;
  v_seller uuid;
  v_net numeric(20,6);
  v_count integer := 0;
begin
  select * into v_order from public.orders where id=p_order_id;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select * into v_tax from public.tax_transactions where order_id=p_order_id and source_type='order' order by created_at desc limit 1;
  select s.vendor_id into v_seller from public.order_items oi join public.stores s on s.id=oi.store_id where oi.order_id=p_order_id order by oi.created_at asc limit 1;
  v_net := greatest(0, v_order.total_amount - coalesce(v_order.platform_commission,0) - coalesce(v_order.affiliate_commission,0) - coalesce(v_order.tax_amount,0));

  insert into public.settlement_allocations(order_id,tax_transaction_id,beneficiary_id,beneficiary_role,gross_amount,tax_amount,commission_amount,withholding_amount,net_amount,currency,status,snapshot)
  values
    (v_order.id,v_tax.id,v_seller,'seller',v_order.total_amount,coalesce(v_order.tax_amount,0),coalesce(v_order.platform_commission,0),0,v_net,trim(v_order.currency::text),'ready',jsonb_build_object('merchant_model',coalesce(v_tax.merchant_model,'marketplace_intermediary'),'tax_snapshot',coalesce(v_tax.snapshot,'{}'::jsonb),'created_at',now()))
  on conflict(order_id,beneficiary_role) do update set
    tax_transaction_id=excluded.tax_transaction_id,gross_amount=excluded.gross_amount,tax_amount=excluded.tax_amount,commission_amount=excluded.commission_amount,net_amount=excluded.net_amount,status='ready',snapshot=excluded.snapshot,updated_at=now();
  v_count := 1;

  insert into public.settlement_allocations(order_id,tax_transaction_id,beneficiary_id,beneficiary_role,gross_amount,tax_amount,commission_amount,withholding_amount,net_amount,currency,status,snapshot)
  values
    (v_order.id,v_tax.id,v_order.buyer_id,'credi_platform',v_order.platform_commission,0,0,0,v_order.platform_commission,trim(v_order.currency::text),'ready',jsonb_build_object('source','platform_commission','created_at',now()))
  on conflict(order_id,beneficiary_role) do update set gross_amount=excluded.gross_amount,net_amount=excluded.net_amount,status='ready',snapshot=excluded.snapshot,updated_at=now();
  v_count := v_count + 1;

  if v_order.affiliate_id is not null and v_order.affiliate_commission > 0 then
    insert into public.settlement_allocations(order_id,tax_transaction_id,beneficiary_id,beneficiary_role,gross_amount,tax_amount,commission_amount,withholding_amount,net_amount,currency,status,snapshot)
    values
      (v_order.id,v_tax.id,v_order.affiliate_id,'affiliate',v_order.affiliate_commission,0,0,0,v_order.affiliate_commission,trim(v_order.currency::text),'ready',jsonb_build_object('source','affiliate_commission','created_at',now()))
    on conflict(order_id,beneficiary_role) do update set gross_amount=excluded.gross_amount,net_amount=excluded.net_amount,status='ready',snapshot=excluded.snapshot,updated_at=now();
    v_count := v_count + 1;
  end if;
  return v_count;
end;
$$;

revoke all on function public.initialize_order_tax_transaction(uuid) from public, anon, authenticated;
revoke all on function public.finalize_order_settlement_allocations(uuid) from public, anon, authenticated;
grant execute on function public.initialize_order_tax_transaction(uuid) to service_role;
grant execute on function public.finalize_order_settlement_allocations(uuid) to service_role;

alter table public.settlement_allocations enable row level security;
create policy settlement_allocations_related_read on public.settlement_allocations for select to authenticated using (
  exists (select 1 from public.orders o where o.id=settlement_allocations.order_id and (o.buyer_id=auth.uid()))
  or beneficiary_id=auth.uid()
  or exists (select 1 from public.profiles p where p.id=auth.uid() and (p.platform_owner=true or p.role='admin'))
);
