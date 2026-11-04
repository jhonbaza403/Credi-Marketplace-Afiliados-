-- Settlement destination registry: schema only, no real account bindings copied.
create table if not exists public.settlement_account_bindings (
  id uuid primary key default gen_random_uuid(),
  beneficiary_role text not null
    check (beneficiary_role in ('platform','government','provider','other')),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint settlement_account_bindings_beneficiary_role_currency_key
    unique (beneficiary_role,currency)
);

create index if not exists settlement_account_bindings_wallet_idx
  on public.settlement_account_bindings(wallet_account_id);
create index if not exists settlement_account_bindings_created_by_idx
  on public.settlement_account_bindings(created_by);

alter table public.settlement_account_bindings enable row level security;

drop policy if exists deny_external_access on public.settlement_account_bindings;
create policy deny_external_access on public.settlement_account_bindings
for all to anon, authenticated using (false) with check (false);
