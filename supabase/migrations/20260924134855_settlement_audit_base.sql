-- Private settlement approval and payout audit history. No production rows copied.
create table if not exists public.settlement_approval_audit (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.settlement_allocations(id) on delete restrict,
  action text not null check (action in ('approved','rejected','cancelled')),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  previous_status text not null,
  new_status text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists settlement_approval_audit_allocation_idx
  on public.settlement_approval_audit(allocation_id,created_at desc);

create table if not exists public.settlement_payout_audit (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.settlement_allocations(id) on delete restrict,
  journal_id uuid references public.wallet_journals(id) on delete restrict,
  action text not null check (action in ('paid','reversed','failed')),
  actor_id uuid references public.profiles(id) on delete restrict,
  amount numeric not null check (amount>0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists settlement_payout_audit_allocation_idx
  on public.settlement_payout_audit(allocation_id,created_at desc);
create unique index if not exists settlement_payout_audit_paid_journal_key
  on public.settlement_payout_audit(journal_id)
  where action='paid' and journal_id is not null;

alter table public.settlement_approval_audit enable row level security;
alter table public.settlement_payout_audit enable row level security;

drop policy if exists deny_external_access on public.settlement_approval_audit;
create policy deny_external_access on public.settlement_approval_audit
for all to anon,authenticated using(false) with check(false);

drop policy if exists deny_external_access on public.settlement_payout_audit;
create policy deny_external_access on public.settlement_payout_audit
for all to anon,authenticated using(false) with check(false);
