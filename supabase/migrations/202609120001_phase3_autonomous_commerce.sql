-- Credi Marketplace Phase 3: Autonomous Commerce foundation
-- Safe-by-default schema for AI scoring, dropshipping content, logistics, escrow,
-- live shopping and cross-domain reputation. Model outputs are advisory/auditable;
-- financial controls remain deterministic.

create extension if not exists pgcrypto;

create table if not exists public.credi_ai_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  decision_type text not null check (decision_type in ('credit','fraud','commerce','logistics','content')),
  model_name text not null,
  model_version text not null,
  input_hash text not null,
  decision text not null,
  score numeric(8,5),
  reasons jsonb not null default '[]'::jsonb,
  policy_version text,
  created_at timestamptz not null default now()
);

create index if not exists credi_ai_decisions_user_idx on public.credi_ai_decisions(user_id, created_at desc);
create index if not exists credi_ai_decisions_type_idx on public.credi_ai_decisions(decision_type, created_at desc);

create table if not exists public.credi_credit_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  score numeric(8,5),
  risk_band text,
  suggested_limit numeric(14,2),
  currency text default 'USD',
  model_name text,
  model_version text,
  last_decision_id uuid references public.credi_ai_decisions(id),
  status text not null default 'pending' check (status in ('pending','approved','review','declined','suspended')),
  updated_at timestamptz not null default now()
);

create table if not exists public.credi_credit_features (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  feature_key text not null,
  feature_value numeric,
  source text not null,
  observed_at timestamptz not null default now(),
  consent_version text,
  expires_at timestamptz
);
create index if not exists credi_credit_features_user_idx on public.credi_credit_features(user_id, observed_at desc);
create index if not exists credi_credit_features_key_idx on public.credi_credit_features(feature_key, observed_at desc);

create table if not exists public.credi_content_jobs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  model text,
  input_hash text not null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  output jsonb,
  quality_score numeric(5,2),
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists credi_content_jobs_product_idx on public.credi_content_jobs(product_id, created_at desc);

create table if not exists public.credi_logistics_routes (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid references auth.users(id) on delete set null,
  route_date date not null,
  status text not null default 'planned' check (status in ('planned','assigned','in_progress','completed','cancelled')),
  optimization_version text,
  demand_score numeric(8,5),
  distance_km numeric(12,3),
  eta_minutes integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists credi_logistics_routes_date_idx on public.credi_logistics_routes(route_date, status);

create table if not exists public.credi_smart_lockers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  partner_store_id uuid references public.stores(id) on delete set null,
  address text,
  status text not null default 'active' check (status in ('active','maintenance','inactive')),
  capacity integer not null default 0 check (capacity >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.credi_locker_shipments (
  id uuid primary key default gen_random_uuid(),
  locker_id uuid references public.credi_smart_lockers(id) on delete restrict not null,
  order_id uuid references public.orders(id) on delete restrict not null,
  status text not null default 'reserved' check (status in ('reserved','loaded','ready_for_pickup','collected','expired','incident')),
  pickup_token_hash text,
  ready_at timestamptz,
  collected_at timestamptz,
  created_at timestamptz not null default now(),
  unique (locker_id, order_id)
);
create index if not exists credi_locker_shipments_locker_idx on public.credi_locker_shipments(locker_id, status);
create index if not exists credi_locker_shipments_order_idx on public.credi_locker_shipments(order_id);

create table if not exists public.credi_escrows (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete restrict not null unique,
  status text not null default 'funded' check (status in ('pending','funded','shipping','delivered','disputed','released','refunded','cancelled')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'USD',
  release_after timestamptz,
  dispute_deadline timestamptz,
  release_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credi_escrow_events (
  id uuid primary key default gen_random_uuid(),
  escrow_id uuid references public.credi_escrows(id) on delete cascade not null,
  event_type text not null,
  evidence jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists credi_escrow_events_idx on public.credi_escrow_events(escrow_id, created_at desc);

create table if not exists public.credi_live_sessions (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','ended','cancelled')),
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.credi_live_products (
  session_id uuid references public.credi_live_sessions(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  featured boolean not null default false,
  sort_order integer not null default 0,
  primary key(session_id, product_id)
);

create table if not exists public.credi_live_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.credi_live_sessions(id) on delete cascade not null,
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists credi_live_events_session_idx on public.credi_live_events(session_id, created_at desc);

create table if not exists public.credi_reputation_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  buyer_score numeric(5,2),
  seller_score numeric(5,2),
  affiliate_score numeric(5,2),
  supplier_score numeric(5,2),
  courier_score numeric(5,2),
  overall_score numeric(5,2),
  methodology_version text not null default 'v1',
  updated_at timestamptz not null default now()
);

create table if not exists public.credi_reputation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  dimension text not null check (dimension in ('buyer','seller','affiliate','supplier','courier')),
  event_type text not null,
  weight numeric(10,4) not null,
  source_table text,
  source_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists credi_reputation_events_user_idx on public.credi_reputation_events(user_id, created_at desc);

alter table public.credi_ai_decisions enable row level security;
alter table public.credi_credit_profiles enable row level security;
alter table public.credi_credit_features enable row level security;
alter table public.credi_content_jobs enable row level security;
alter table public.credi_logistics_routes enable row level security;
alter table public.credi_smart_lockers enable row level security;
alter table public.credi_locker_shipments enable row level security;
alter table public.credi_escrows enable row level security;
alter table public.credi_escrow_events enable row level security;
alter table public.credi_live_sessions enable row level security;
alter table public.credi_live_products enable row level security;
alter table public.credi_live_events enable row level security;
alter table public.credi_reputation_profiles enable row level security;
alter table public.credi_reputation_events enable row level security;

create policy credi_credit_profiles_self on public.credi_credit_profiles for select to authenticated using (auth.uid() = user_id);
create policy credi_credit_features_self on public.credi_credit_features for select to authenticated using (auth.uid() = user_id);
create policy credi_reputation_self on public.credi_reputation_profiles for select to authenticated using (auth.uid() = user_id);
create policy credi_live_sessions_public_read on public.credi_live_sessions for select to anon, authenticated using (status in ('scheduled','live','ended'));
create policy credi_live_products_public_read on public.credi_live_products for select to anon, authenticated using (exists (select 1 from public.credi_live_sessions s where s.id = session_id and s.status in ('scheduled','live','ended')));

revoke all on table public.credi_ai_decisions from anon, authenticated;
revoke all on table public.credi_content_jobs from anon, authenticated;
revoke all on table public.credi_logistics_routes from anon, authenticated;
revoke all on table public.credi_smart_lockers from anon, authenticated;
revoke all on table public.credi_locker_shipments from anon, authenticated;
revoke all on table public.credi_escrows from anon, authenticated;
revoke all on table public.credi_escrow_events from anon, authenticated;
revoke all on table public.credi_live_events from anon, authenticated;
revoke all on table public.credi_reputation_events from anon, authenticated;
