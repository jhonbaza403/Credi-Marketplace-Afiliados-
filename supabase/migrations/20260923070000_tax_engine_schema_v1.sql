-- Credi Tax Engine v1 canonical schema.
-- This migration mirrors the schema currently used by the production Supabase
-- project so the tax engine is reproducible from Git. It deliberately inserts
-- no jurisdiction-specific tax rates.
create table if not exists public.tax_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null,
  jurisdiction_code text not null,
  name text not null,
  parent_jurisdiction_id uuid references public.tax_jurisdictions(id),
  timezone text,
  currency char(3),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(country_code,jurisdiction_code)
);

create table if not exists public.tax_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid references public.tax_jurisdictions(id),
  tax_category_id uuid references public.tax_categories(id),
  rate numeric not null check (rate >= 0),
  effective_from timestamptz,
  effective_to timestamptz,
  source_reference text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tax_rules (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid references public.tax_jurisdictions(id),
  tax_category_id uuid references public.tax_categories(id),
  rule_code text not null,
  taxpayer_role text not null,
  collection_role text,
  calculation_method text,
  rate_id uuid references public.tax_rates(id),
  priority integer not null default 100,
  effective_from timestamptz,
  effective_to timestamptz,
  active boolean not null default true,
  conditions jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tax_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  buyer_id uuid,
  seller_id uuid,
  affiliate_id uuid,
  provider_id uuid,
  jurisdiction_id uuid references public.tax_jurisdictions(id),
  taxpayer_role text not null,
  tax_period text,
  currency char(3) not null,
  gross_amount numeric not null check (gross_amount >= 0),
  taxable_amount numeric not null check (taxable_amount >= 0),
  tax_amount numeric not null check (tax_amount >= 0),
  status text not null,
  snapshot jsonb not null default '{}'::jsonb,
  source_type text not null,
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  merchant_model text not null default 'marketplace_intermediary'
    check (merchant_model in ('marketplace_intermediary','merchant_of_record','hybrid')),
  rule_version text,
  calculation_status text not null default 'not_configured'
    check (calculation_status in ('not_configured','calculated','review_required'))
);

create table if not exists public.tax_transaction_lines (
  id uuid primary key default gen_random_uuid(),
  tax_transaction_id uuid not null references public.tax_transactions(id) on delete cascade,
  tax_rule_id uuid references public.tax_rules(id),
  tax_category_id uuid references public.tax_categories(id),
  jurisdiction_id uuid references public.tax_jurisdictions(id),
  taxpayer_id uuid,
  responsible_party text not null,
  collected_by text not null,
  tax_type text not null,
  rate numeric not null check (rate >= 0),
  taxable_amount numeric not null check (taxable_amount >= 0),
  tax_amount numeric not null check (tax_amount >= 0),
  currency char(3) not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  merchant_model text not null default 'marketplace_intermediary'
    check (merchant_model in ('marketplace_intermediary','merchant_of_record','hybrid'))
);

create table if not exists public.tax_withholdings (
  id uuid primary key default gen_random_uuid(),
  tax_transaction_id uuid not null references public.tax_transactions(id) on delete cascade,
  order_id uuid references public.orders(id),
  payee_id uuid not null,
  jurisdiction_id uuid references public.tax_jurisdictions(id),
  tax_type text not null,
  rate numeric not null check (rate >= 0),
  base_amount numeric not null check (base_amount >= 0),
  withheld_amount numeric not null check (withheld_amount >= 0),
  currency char(3) not null,
  status text not null default 'pending',
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tax_collections (
  id uuid primary key default gen_random_uuid(),
  tax_transaction_id uuid not null references public.tax_transactions(id) on delete cascade,
  order_id uuid references public.orders(id),
  collected_by uuid,
  beneficiary_role text not null,
  jurisdiction_id uuid references public.tax_jurisdictions(id),
  tax_type text not null,
  amount numeric not null check (amount >= 0),
  currency char(3) not null,
  status text not null default 'collected',
  collected_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.tax_reports (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references public.tax_jurisdictions(id),
  reporting_entity_id uuid,
  tax_type text not null,
  period_start date not null,
  period_end date not null,
  currency char(3) not null,
  gross_base numeric not null default 0,
  taxable_base numeric not null default 0,
  tax_collected numeric not null default 0,
  tax_withheld numeric not null default 0,
  status text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  merchant_model text not null default 'marketplace_intermediary'
);

create table if not exists public.tax_filings (
  id uuid primary key default gen_random_uuid(),
  tax_report_id uuid not null references public.tax_reports(id),
  jurisdiction_id uuid not null references public.tax_jurisdictions(id),
  filing_reference text,
  filed_by uuid,
  filed_at timestamptz,
  status text not null,
  response_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tax_exemptions (
  id uuid primary key default gen_random_uuid(),
  taxpayer_id uuid not null,
  tax_category_id uuid references public.tax_categories(id),
  jurisdiction_id uuid references public.tax_jurisdictions(id),
  certificate_id text,
  exemption_reason text,
  effective_from timestamptz not null,
  effective_to timestamptz,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from)
);

create table if not exists public.tax_certificates (
  id uuid primary key default gen_random_uuid(),
  taxpayer_id uuid not null,
  jurisdiction_id uuid references public.tax_jurisdictions(id),
  certificate_type text not null,
  certificate_number text,
  issuer text,
  issued_at date,
  expires_at date,
  document_url text,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_tax_transactions_order_source
  on public.tax_transactions(order_id, source_type)
  where order_id is not null;

create index if not exists idx_tax_transactions_order on public.tax_transactions(order_id);
create index if not exists idx_tax_transactions_buyer on public.tax_transactions(buyer_id);
create index if not exists idx_tax_transactions_seller on public.tax_transactions(seller_id);
create index if not exists idx_tax_transaction_lines_transaction on public.tax_transaction_lines(tax_transaction_id);
create index if not exists idx_tax_rules_jurisdiction on public.tax_rules(jurisdiction_id);
create index if not exists idx_tax_rates_jurisdiction_category on public.tax_rates(jurisdiction_id,tax_category_id);

insert into public.tax_jurisdictions(country_code,jurisdiction_code,name,active)
values ('ZZ','NOT_CONFIGURED','Tax jurisdiction not configured',true)
on conflict (country_code,jurisdiction_code) do nothing;

insert into public.tax_categories(code,name,description,active)
values ('generic','Generic / not configured','Placeholder category; no real-world tax rate is asserted.',true)
on conflict (code) do nothing;

alter table public.tax_jurisdictions enable row level security;
alter table public.tax_categories enable row level security;
alter table public.tax_rates enable row level security;
alter table public.tax_rules enable row level security;
alter table public.tax_transactions enable row level security;
alter table public.tax_transaction_lines enable row level security;
alter table public.tax_withholdings enable row level security;
alter table public.tax_collections enable row level security;
alter table public.tax_reports enable row level security;
alter table public.tax_filings enable row level security;
alter table public.tax_exemptions enable row level security;
alter table public.tax_certificates enable row level security;

revoke all on table public.tax_jurisdictions,public.tax_categories,public.tax_rates,public.tax_rules,
  public.tax_transactions,public.tax_transaction_lines,public.tax_withholdings,public.tax_collections,
  public.tax_reports,public.tax_filings,public.tax_exemptions,public.tax_certificates from anon;

grant select on public.tax_jurisdictions,public.tax_categories,public.tax_rates,public.tax_rules to authenticated;

drop policy if exists tax_jurisdictions_read on public.tax_jurisdictions;
create policy tax_jurisdictions_read on public.tax_jurisdictions for select to authenticated using (true);
drop policy if exists tax_categories_read on public.tax_categories;
create policy tax_categories_read on public.tax_categories for select to authenticated using (true);
drop policy if exists tax_rates_read on public.tax_rates;
create policy tax_rates_read on public.tax_rates for select to authenticated using (active = true);
drop policy if exists tax_rules_read on public.tax_rules;
create policy tax_rules_read on public.tax_rules for select to authenticated using (active = true);

drop policy if exists tax_transactions_owner_read on public.tax_transactions;
create policy tax_transactions_owner_read on public.tax_transactions for select to authenticated
using ((select auth.uid()) = buyer_id or (select auth.uid()) = seller_id or (select auth.uid()) = affiliate_id);

drop policy if exists tax_transaction_lines_owner_read on public.tax_transaction_lines;
create policy tax_transaction_lines_owner_read on public.tax_transaction_lines for select to authenticated
using (exists (
  select 1 from public.tax_transactions t
  where t.id = tax_transaction_lines.tax_transaction_id
    and ((select auth.uid()) = t.buyer_id or (select auth.uid()) = t.seller_id or (select auth.uid()) = t.affiliate_id)
));

drop policy if exists tax_withholdings_owner_read on public.tax_withholdings;
create policy tax_withholdings_owner_read on public.tax_withholdings for select to authenticated
using (exists (
  select 1 from public.tax_transactions t
  where t.id = tax_withholdings.tax_transaction_id
    and ((select auth.uid()) = t.buyer_id or (select auth.uid()) = t.seller_id or (select auth.uid()) = t.affiliate_id)
));

drop policy if exists tax_collections_owner_read on public.tax_collections;
create policy tax_collections_owner_read on public.tax_collections for select to authenticated
using (exists (
  select 1 from public.tax_transactions t
  where t.id = tax_collections.tax_transaction_id
    and ((select auth.uid()) = t.buyer_id or (select auth.uid()) = t.seller_id or (select auth.uid()) = t.affiliate_id)
));

revoke all on table public.tax_reports,public.tax_filings,public.tax_exemptions,public.tax_certificates from authenticated;

create or replace function public.initialize_order_tax_transaction(p_order_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_seller uuid;
  v_tax_id uuid;
  v_jurisdiction uuid;
  v_snapshot jsonb;
begin
  if (select auth.uid()) is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into v_order from public.orders
  where id=p_order_id and buyer_id=(select auth.uid()) for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  select s.vendor_id into v_seller
  from public.order_items oi join public.stores s on s.id=oi.store_id
  where oi.order_id=p_order_id order by oi.created_at asc limit 1;

  select id into v_jurisdiction from public.tax_jurisdictions
  where jurisdiction_code='NOT_CONFIGURED' and country_code='ZZ' and active=true limit 1;

  v_snapshot := jsonb_build_object(
    'engine_version','1.0.0','calculation_status','not_configured',
    'merchant_model','marketplace_intermediary','order_id',v_order.id,
    'buyer_id',v_order.buyer_id,'seller_id',v_seller,'region',v_order.region,
    'jurisdiction_code','NOT_CONFIGURED','jurisdiction_country','ZZ',
    'tax_category_code','generic','gross_amount',v_order.total_amount,
    'taxable_amount',0,'tax_amount',0,'currency',trim(v_order.currency::text),
    'snapshot_at',now(),
    'reason','No verified jurisdiction-specific tax rule is configured; no tax is asserted by the engine.'
  );

  insert into public.tax_transactions(
    order_id,buyer_id,seller_id,affiliate_id,jurisdiction_id,taxpayer_role,tax_period,currency,
    gross_amount,taxable_amount,tax_amount,status,snapshot,source_type,source_reference,
    merchant_model,rule_version,calculation_status
  ) values (
    v_order.id,v_order.buyer_id,v_seller,v_order.affiliate_id,v_jurisdiction,'seller',
    to_char(coalesce(v_order.created_at,now()),'YYYY-MM'),trim(v_order.currency::text),
    v_order.total_amount,0,0,'calculated',v_snapshot,'order',v_order.id::text,
    'marketplace_intermediary','1.0.0','not_configured'
  )
  on conflict (order_id,source_type) where order_id is not null
  do update set snapshot=excluded.snapshot,updated_at=now()
  returning id into v_tax_id;

  update public.orders set tax_engine_status='not_configured',tax_snapshot=v_snapshot,tax_amount=0,updated_at=now()
  where id=p_order_id;
  return v_tax_id;
end;
$$;

create or replace function public.finalize_order_settlement_allocations(p_order_id uuid)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_tax public.tax_transactions%rowtype;
  v_seller uuid;
  v_net numeric;
  v_count integer := 0;
begin
  select * into v_order from public.orders where id=p_order_id;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  select * into v_tax from public.tax_transactions
  where order_id=p_order_id and source_type='order'
  order by created_at desc limit 1;

  select s.vendor_id into v_seller
  from public.order_items oi join public.stores s on s.id=oi.store_id
  where oi.order_id=p_order_id order by oi.created_at asc limit 1;

  v_net := greatest(0,v_order.total_amount-coalesce(v_order.platform_commission,0)
    -coalesce(v_order.affiliate_commission,0)-coalesce(v_order.tax_amount,0));

  insert into public.settlement_allocations(
    order_id,tax_transaction_id,beneficiary_id,beneficiary_role,gross_amount,tax_amount,
    commission_amount,withholding_amount,net_amount,currency,status,snapshot
  ) values (
    v_order.id,v_tax.id,v_seller,'seller',v_order.total_amount,coalesce(v_order.tax_amount,0),
    coalesce(v_order.platform_commission,0),0,v_net,trim(v_order.currency::text),'ready',
    jsonb_build_object('merchant_model',coalesce(v_tax.merchant_model,'marketplace_intermediary'),
      'tax_snapshot',coalesce(v_tax.snapshot,'{}'::jsonb),'created_at',now())
  )
  on conflict(order_id,beneficiary_role) do update set
    tax_transaction_id=excluded.tax_transaction_id,gross_amount=excluded.gross_amount,
    tax_amount=excluded.tax_amount,commission_amount=excluded.commission_amount,
    net_amount=excluded.net_amount,status='ready',snapshot=excluded.snapshot,updated_at=now();
  v_count:=1;

  insert into public.settlement_allocations(
    order_id,tax_transaction_id,beneficiary_id,beneficiary_role,gross_amount,tax_amount,
    commission_amount,withholding_amount,net_amount,currency,status,snapshot
  ) values (
    v_order.id,v_tax.id,v_order.buyer_id,'credi_platform',v_order.platform_commission,0,0,0,
    v_order.platform_commission,trim(v_order.currency::text),'ready',
    jsonb_build_object('source','platform_commission','created_at',now())
  )
  on conflict(order_id,beneficiary_role) do update set
    gross_amount=excluded.gross_amount,net_amount=excluded.net_amount,status='ready',
    snapshot=excluded.snapshot,updated_at=now();
  v_count:=v_count+1;

  if v_order.affiliate_id is not null and v_order.affiliate_commission>0 then
    insert into public.settlement_allocations(
      order_id,tax_transaction_id,beneficiary_id,beneficiary_role,gross_amount,tax_amount,
      commission_amount,withholding_amount,net_amount,currency,status,snapshot
    ) values (
      v_order.id,v_tax.id,v_order.affiliate_id,'affiliate',v_order.affiliate_commission,0,0,0,
      v_order.affiliate_commission,trim(v_order.currency::text),'ready',
      jsonb_build_object('source','affiliate_commission','created_at',now())
    )
    on conflict(order_id,beneficiary_role) do update set
      gross_amount=excluded.gross_amount,net_amount=excluded.net_amount,status='ready',
      snapshot=excluded.snapshot,updated_at=now();
    v_count:=v_count+1;
  end if;
  return v_count;
end;
$$;

revoke all on function public.initialize_order_tax_transaction(uuid) from public,anon;
grant execute on function public.initialize_order_tax_transaction(uuid) to authenticated,service_role;
revoke all on function public.finalize_order_settlement_allocations(uuid) from public,anon,authenticated;
grant execute on function public.finalize_order_settlement_allocations(uuid) to service_role;
