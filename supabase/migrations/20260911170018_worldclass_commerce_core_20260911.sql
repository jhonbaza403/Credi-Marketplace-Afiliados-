create extension if not exists pgcrypto;

create table if not exists public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  currency char(3) not null default 'USD',
  available_balance numeric(20,8) not null default 0 check (available_balance >= 0),
  pending_balance numeric(20,8) not null default 0 check (pending_balance >= 0),
  status text not null default 'active' check (status in ('active','frozen','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallet_accounts(id) on delete cascade,
  direction text not null check (direction in ('credit','debit')),
  amount numeric(20,8) not null check (amount > 0),
  currency char(3) not null default 'USD',
  entry_type text not null,
  reference_type text,
  reference_id uuid,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method_type text not null check (method_type in ('stripe','crypto','bank_transfer','wallet','manual')),
  provider text,
  label text not null,
  last4 text,
  currency char(3) not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_methods_default_per_user on public.payment_methods(user_id) where is_default;

create table if not exists public.payment_orchestrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  amount numeric(20,8) not null check (amount > 0),
  currency char(3) not null default 'USD',
  method_type text not null check (method_type in ('stripe','crypto','bank_transfer','wallet','manual')),
  provider text,
  status text not null default 'created' check (status in ('created','pending','requires_action','succeeded','failed','cancelled','expired')),
  provider_reference text,
  client_reference text,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.negotiations (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid references public.business_rfqs(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  state text not null default 'open' check (state in ('open','accepted','rejected','expired','cancelled')),
  currency char(3) not null default 'USD',
  quantity numeric(20,8) not null default 1 check (quantity > 0),
  current_price numeric(20,8) not null check (current_price >= 0),
  buyer_max_price numeric(20,8),
  seller_min_price numeric(20,8),
  rounds integer not null default 0 check (rounds >= 0),
  auto_mode boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.negotiation_offers (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null references public.negotiations(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  actor_role text not null check (actor_role in ('buyer','seller','agent')),
  amount numeric(20,8) not null check (amount >= 0),
  currency char(3) not null default 'USD',
  quantity numeric(20,8),
  terms text,
  strategy text,
  status text not null default 'proposed' check (status in ('proposed','countered','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now()
);

create table if not exists public.operational_risk_signals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  score numeric(5,2) not null default 0 check (score >= 0 and score <= 100),
  level text not null default 'unknown' check (level in ('unknown','low','moderate','high')),
  factors jsonb not null default '{}'::jsonb,
  confidence numeric(5,2) not null default 0 check (confidence >= 0 and confidence <= 100),
  model_version text not null default 'operational-v1',
  evaluated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_date date not null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, metric_date)
);

create table if not exists public.developer_apps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  scopes text[] not null default '{}',
  redirect_urls text[] not null default '{}',
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, slug)
);

create table if not exists public.developer_api_keys (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.developer_apps(id) on delete cascade,
  key_prefix text not null,
  key_hash text not null unique,
  label text not null,
  last_used_at timestamptz,
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active','revoked')),
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_apps (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  category text not null default 'business',
  pricing_model text not null default 'free' check (pricing_model in ('free','subscription','usage','one_time')),
  status text not null default 'draft' check (status in ('draft','published','suspended')),
  manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists negotiations_buyer_idx on public.negotiations(buyer_id, updated_at desc);
create index if not exists negotiations_seller_idx on public.negotiations(seller_id, updated_at desc);
create index if not exists negotiation_offers_negotiation_idx on public.negotiation_offers(negotiation_id, created_at desc);
create index if not exists payment_orchestrations_user_idx on public.payment_orchestrations(user_id, created_at desc);
create index if not exists wallet_ledger_wallet_idx on public.wallet_ledger(wallet_id, created_at desc);
create index if not exists developer_api_keys_app_idx on public.developer_api_keys(app_id);
create index if not exists marketplace_apps_status_idx on public.marketplace_apps(status, created_at desc);

alter table public.wallet_accounts enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.payment_methods enable row level security;
alter table public.payment_orchestrations enable row level security;
alter table public.negotiations enable row level security;
alter table public.negotiation_offers enable row level security;
alter table public.operational_risk_signals enable row level security;
alter table public.analytics_daily enable row level security;
alter table public.developer_apps enable row level security;
alter table public.developer_api_keys enable row level security;
alter table public.marketplace_apps enable row level security;

create policy wallet_accounts_owner on public.wallet_accounts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy wallet_ledger_owner on public.wallet_ledger for select using (exists(select 1 from public.wallet_accounts w where w.id = wallet_id and w.user_id = auth.uid()));
create policy payment_methods_owner on public.payment_methods for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy payment_orchestrations_owner on public.payment_orchestrations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy negotiations_participant on public.negotiations for all using (buyer_id = auth.uid() or seller_id = auth.uid()) with check (buyer_id = auth.uid() or seller_id = auth.uid());
create policy negotiation_offers_participant on public.negotiation_offers for select using (exists(select 1 from public.negotiations n where n.id = negotiation_id and (n.buyer_id = auth.uid() or n.seller_id = auth.uid())));
create policy negotiation_offers_actor on public.negotiation_offers for insert with check (actor_id = auth.uid() and exists(select 1 from public.negotiations n where n.id = negotiation_id and (n.buyer_id = auth.uid() or n.seller_id = auth.uid())));
create policy risk_signals_owner on public.operational_risk_signals for select using (user_id = auth.uid());
create policy risk_signals_owner_upsert on public.operational_risk_signals for insert with check (user_id = auth.uid());
create policy risk_signals_owner_update on public.operational_risk_signals for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy analytics_owner on public.analytics_daily for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy developer_apps_owner on public.developer_apps for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy developer_api_keys_owner on public.developer_api_keys for all using (exists(select 1 from public.developer_apps a where a.id = app_id and a.owner_id = auth.uid())) with check (exists(select 1 from public.developer_apps a where a.id = app_id and a.owner_id = auth.uid()));
create policy marketplace_apps_public_read on public.marketplace_apps for select using (status = 'published' or publisher_id = auth.uid());
create policy marketplace_apps_owner_write on public.marketplace_apps for all using (publisher_id = auth.uid()) with check (publisher_id = auth.uid());

create or replace function public.ensure_my_wallet() returns public.wallet_accounts language plpgsql security definer set search_path = public as $$
declare v public.wallet_accounts;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  insert into public.wallet_accounts(user_id) values(auth.uid()) on conflict(user_id) do nothing;
  select * into v from public.wallet_accounts where user_id = auth.uid();
  return v;
end $$;

revoke all on function public.ensure_my_wallet() from public;
grant execute on function public.ensure_my_wallet() to authenticated;
