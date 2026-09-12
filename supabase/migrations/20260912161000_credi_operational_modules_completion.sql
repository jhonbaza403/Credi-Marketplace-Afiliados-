create table if not exists public.credi_flex_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  service_level text not null default 'standard' check (service_level in ('standard','priority','same_day')),
  destination_country char(2),
  status text not null default 'planned' check (status in ('planned','ready','assigned','in_transit','delivered','cancelled')),
  recommendation jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_credi_flex_owner_created on public.credi_flex_plans(owner_id, created_at desc);
create index if not exists idx_credi_flex_order on public.credi_flex_plans(order_id);
alter table public.credi_flex_plans enable row level security;
drop policy if exists credi_flex_owner_select on public.credi_flex_plans;
drop policy if exists credi_flex_owner_insert on public.credi_flex_plans;
drop policy if exists credi_flex_owner_update on public.credi_flex_plans;
create policy credi_flex_owner_select on public.credi_flex_plans for select to authenticated using (owner_id = (select auth.uid()));
create policy credi_flex_owner_insert on public.credi_flex_plans for insert to authenticated with check (owner_id = (select auth.uid()));
create policy credi_flex_owner_update on public.credi_flex_plans for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create table if not exists public.credi_locker_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  locker_code text,
  pickup_country char(2),
  pickup_city text,
  pickup_address text,
  status text not null default 'pending' check (status in ('pending','assigned','ready','picked_up','cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_credi_locker_user_created on public.credi_locker_requests(user_id, created_at desc);
create index if not exists idx_credi_locker_order on public.credi_locker_requests(order_id);
alter table public.credi_locker_requests enable row level security;
drop policy if exists credi_locker_owner_select on public.credi_locker_requests;
drop policy if exists credi_locker_owner_insert on public.credi_locker_requests;
drop policy if exists credi_locker_owner_update on public.credi_locker_requests;
create policy credi_locker_owner_select on public.credi_locker_requests for select to authenticated using (user_id = (select auth.uid()));
create policy credi_locker_owner_insert on public.credi_locker_requests for insert to authenticated with check (user_id = (select auth.uid()));
create policy credi_locker_owner_update on public.credi_locker_requests for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.credi_escrow_cases (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete restrict,
  seller_id uuid references auth.users(id) on delete restrict,
  amount numeric(20,2) not null check (amount > 0),
  currency char(3) not null default 'USD',
  status text not null default 'requested' check (status in ('requested','funded','releasable','released','disputed','refunded','cancelled')),
  release_condition text not null default 'verified_delivery',
  provider text not null default 'internal_workflow',
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb,
  funded_at timestamptz,
  released_at timestamptz,
  disputed_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_credi_escrow_buyer_created on public.credi_escrow_cases(buyer_id, created_at desc);
create index if not exists idx_credi_escrow_seller_created on public.credi_escrow_cases(seller_id, created_at desc);
create index if not exists idx_credi_escrow_status on public.credi_escrow_cases(status, created_at desc);
alter table public.credi_escrow_cases enable row level security;
drop policy if exists credi_escrow_participant_select on public.credi_escrow_cases;
drop policy if exists credi_escrow_buyer_insert on public.credi_escrow_cases;
drop policy if exists credi_escrow_admin_update on public.credi_escrow_cases;
create policy credi_escrow_participant_select on public.credi_escrow_cases for select to authenticated using (
  buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and (p.role = 'admin' or p.platform_owner = true)
  )
);
create policy credi_escrow_buyer_insert on public.credi_escrow_cases for insert to authenticated with check (buyer_id = (select auth.uid()));
create policy credi_escrow_admin_update on public.credi_escrow_cases for update to authenticated using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and (p.role = 'admin' or p.platform_owner = true))
) with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and (p.role = 'admin' or p.platform_owner = true))
);
