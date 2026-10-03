create table if not exists public.commerce_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid null references public.orders(id) on delete set null,
  opened_by uuid not null references auth.users(id) on delete cascade,
  counterparty_id uuid null references auth.users(id) on delete set null,
  store_id uuid null references public.stores(id) on delete set null,
  reason text not null,
  description text not null,
  status text not null default 'open' check (status in ('open','under_review','resolved','rejected','cancelled')),
  resolution text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.commerce_disputes enable row level security;
drop policy if exists commerce_disputes_participant_select on public.commerce_disputes;
create policy commerce_disputes_participant_select on public.commerce_disputes for select to authenticated using ((select auth.uid()) = opened_by or (select auth.uid()) = counterparty_id or exists (select 1 from public.stores s where s.id = commerce_disputes.store_id and s.vendor_id = (select auth.uid())));
drop policy if exists commerce_disputes_opened_insert on public.commerce_disputes;
create policy commerce_disputes_opened_insert on public.commerce_disputes for insert to authenticated with check ((select auth.uid()) = opened_by);
drop policy if exists commerce_disputes_opened_update on public.commerce_disputes;
create policy commerce_disputes_opened_update on public.commerce_disputes for update to authenticated using ((select auth.uid()) = opened_by) with check ((select auth.uid()) = opened_by);
create index if not exists commerce_disputes_order_idx on public.commerce_disputes(order_id);
create index if not exists commerce_disputes_opened_by_idx on public.commerce_disputes(opened_by, created_at desc);
create index if not exists commerce_disputes_counterparty_idx on public.commerce_disputes(counterparty_id, created_at desc);
create index if not exists commerce_disputes_store_idx on public.commerce_disputes(store_id, created_at desc);

create table if not exists public.commerce_market_rules (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null,
  currency char(3) not null default 'USD',
  locale text not null default 'en-US',
  tax_mode text not null default 'exclusive',
  payment_methods text[] not null default '{}',
  restricted_categories text[] not null default '{}',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(country_code)
);
insert into public.commerce_market_rules(country_code,currency,locale,payment_methods) values
 ('CA','CAD','en-CA',array['stripe','bank_transfer','wallet']),
 ('US','USD','en-US',array['stripe','bank_transfer','wallet']),
 ('VE','USD','es-VE',array['bank_transfer','crypto','wallet']),
 ('CO','COP','es-CO',array['stripe','bank_transfer','wallet']),
 ('MX','MXN','es-MX',array['stripe','bank_transfer','wallet']),
 ('BR','BRL','pt-BR',array['stripe','bank_transfer','wallet']),
 ('NL','EUR','nl-NL',array['stripe','bank_transfer','wallet'])
on conflict(country_code) do nothing;
revoke all on public.commerce_market_rules from anon;
grant select on public.commerce_market_rules to authenticated;
