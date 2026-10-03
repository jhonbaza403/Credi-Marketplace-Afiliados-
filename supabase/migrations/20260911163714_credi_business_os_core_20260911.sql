create table if not exists public.business_rfqs (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  title text not null check (char_length(title) between 3 and 300),
  description text not null check (char_length(description) between 10 and 12000),
  category text,
  quantity numeric not null default 1 check (quantity > 0),
  target_unit_price numeric check (target_unit_price is null or target_unit_price >= 0),
  currency char(3) not null default 'USD',
  delivery_country text,
  delivery_region text,
  needed_by date,
  status text not null default 'open' check (status in ('draft','open','quoted','awarded','closed','cancelled')),
  visibility text not null default 'network' check (visibility in ('private','network')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_rfq_quotes (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.business_rfqs(id) on delete cascade,
  supplier_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  unit_price numeric not null check (unit_price >= 0),
  currency char(3) not null default 'USD',
  min_order_quantity numeric check (min_order_quantity is null or min_order_quantity > 0),
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
  available_quantity numeric check (available_quantity is null or available_quantity >= 0),
  payment_terms text,
  delivery_terms text,
  notes text,
  status text not null default 'submitted' check (status in ('submitted','shortlisted','accepted','rejected','withdrawn')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rfq_id, supplier_id)
);

create table if not exists public.business_automation_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 160),
  trigger_type text not null,
  trigger_config jsonb not null default '{}'::jsonb,
  action_type text not null,
  action_config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_action_audit (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  agent_name text not null default 'credi-ai',
  action text not null,
  resource_type text,
  resource_id uuid,
  authorization_level text not null default 'read',
  status text not null default 'proposed' check (status in ('proposed','authorized','executed','rejected','failed')),
  request_id text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_business_rfqs_buyer_status on public.business_rfqs(buyer_id, status, created_at desc);
create index if not exists idx_business_rfqs_status on public.business_rfqs(status, created_at desc);
create index if not exists idx_business_rfq_quotes_rfq on public.business_rfq_quotes(rfq_id, status, created_at desc);
create index if not exists idx_business_rfq_quotes_supplier on public.business_rfq_quotes(supplier_id, created_at desc);
create index if not exists idx_business_automation_owner on public.business_automation_rules(owner_id, enabled);
create index if not exists idx_agent_action_owner_created on public.agent_action_audit(owner_id, created_at desc);

alter table public.business_rfqs enable row level security;
alter table public.business_rfq_quotes enable row level security;
alter table public.business_automation_rules enable row level security;
alter table public.agent_action_audit enable row level security;

create policy business_rfqs_owner_select on public.business_rfqs for select using (buyer_id = auth.uid());
create policy business_rfqs_owner_insert on public.business_rfqs for insert with check (buyer_id = auth.uid());
create policy business_rfqs_owner_update on public.business_rfqs for update using (buyer_id = auth.uid()) with check (buyer_id = auth.uid());
create policy business_rfqs_owner_delete on public.business_rfqs for delete using (buyer_id = auth.uid());

create policy business_rfq_quotes_owner_select on public.business_rfq_quotes for select using (
  supplier_id = auth.uid() or exists (select 1 from public.business_rfqs r where r.id = rfq_id and r.buyer_id = auth.uid())
);
create policy business_rfq_quotes_supplier_insert on public.business_rfq_quotes for insert with check (supplier_id = auth.uid());
create policy business_rfq_quotes_owner_update on public.business_rfq_quotes for update using (
  supplier_id = auth.uid() or exists (select 1 from public.business_rfqs r where r.id = rfq_id and r.buyer_id = auth.uid())
) with check (supplier_id = auth.uid() or exists (select 1 from public.business_rfqs r where r.id = rfq_id and r.buyer_id = auth.uid()));

create policy automation_owner_all on public.business_automation_rules for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy agent_audit_owner_select on public.agent_action_audit for select using (owner_id = auth.uid());
create policy agent_audit_owner_insert on public.agent_action_audit for insert with check (owner_id = auth.uid());

create or replace function public.touch_business_os_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists business_rfqs_updated_at on public.business_rfqs;
create trigger business_rfqs_updated_at before update on public.business_rfqs for each row execute function public.touch_business_os_updated_at();
drop trigger if exists business_rfq_quotes_updated_at on public.business_rfq_quotes;
create trigger business_rfq_quotes_updated_at before update on public.business_rfq_quotes for each row execute function public.touch_business_os_updated_at();
drop trigger if exists business_automation_rules_updated_at on public.business_automation_rules;
create trigger business_automation_rules_updated_at before update on public.business_automation_rules for each row execute function public.touch_business_os_updated_at();
