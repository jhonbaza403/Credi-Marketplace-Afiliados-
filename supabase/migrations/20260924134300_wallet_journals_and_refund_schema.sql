-- Canonical accounting journal base schema.
-- This migration intentionally creates structure only; no production ledger rows are copied.

create schema if not exists private;

create table if not exists public.wallet_journals (
  id uuid primary key default gen_random_uuid(),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  journal_type text not null
    check (journal_type in ('transfer','payment','refund','reversal','settlement','fee','tax','adjustment')),
  reference_type text,
  reference_id uuid,
  idempotency_key text not null unique,
  status text not null default 'posted'
    check (status in ('pending','posted','reversed','void')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  parent_journal_id uuid references public.wallet_journals(id) on delete restrict,
  operation_id uuid
);

create index if not exists wallet_journals_parent_idx
  on public.wallet_journals(parent_journal_id);
create index if not exists wallet_journals_reference_idx
  on public.wallet_journals(reference_type, reference_id);
create index if not exists idx_wallet_journals_operation_id
  on public.wallet_journals(operation_id);

alter table public.wallet_ledger
  add column if not exists journal_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.wallet_ledger'::regclass
      and conname='wallet_ledger_journal_currency_fk'
  ) then
    alter table public.wallet_ledger
      add constraint wallet_ledger_journal_currency_fk
      foreign key (journal_id) references public.wallet_journals(id) on delete restrict;
  end if;
end
$$;

create or replace function private.validate_wallet_journal_balance(p_journal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_currency char(3);
  v_debit numeric;
  v_credit numeric;
  v_count bigint;
  v_bad_currency bigint;
begin
  select currency into v_currency
  from public.wallet_journals where id=p_journal_id;

  if not found or v_currency is null then
    raise exception 'WALLET_JOURNAL_NOT_FOUND';
  end if;

  select
    count(*),
    coalesce(sum(case when direction='debit' then amount else 0 end),0),
    coalesce(sum(case when direction='credit' then amount else 0 end),0),
    count(*) filter (where currency<>v_currency)
  into v_count,v_debit,v_credit,v_bad_currency
  from public.wallet_ledger
  where journal_id=p_journal_id;

  if v_count<2 then
    raise exception 'WALLET_JOURNAL_NOT_BALANCED: journal % requires at least two ledger entries',p_journal_id
      using errcode='23514';
  end if;
  if v_bad_currency>0 then
    raise exception 'WALLET_JOURNAL_CURRENCY_MISMATCH: journal %',p_journal_id
      using errcode='23514';
  end if;
  if round(v_debit,8)<>round(v_credit,8) then
    raise exception 'WALLET_JOURNAL_UNBALANCED: journal % debit=% credit=%',p_journal_id,v_debit,v_credit
      using errcode='23514';
  end if;
end;
$function$;

create or replace function private.enforce_posted_wallet_journal_balance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_journal_id uuid;
  v_status text;
  v_currency char(3);
  v_debit numeric;
  v_credit numeric;
  v_count bigint;
  v_bad_currency bigint;
begin
  if tg_op='DELETE' then
    v_journal_id:=old.journal_id;
  else
    v_journal_id:=new.journal_id;
  end if;

  if v_journal_id is null then return null; end if;

  select status,currency into v_status,v_currency
  from public.wallet_journals
  where id=v_journal_id
  for share;

  if not found or v_status<>'posted' then return null; end if;

  select
    count(*),
    coalesce(sum(case when direction='debit' then amount else 0 end),0),
    coalesce(sum(case when direction='credit' then amount else 0 end),0),
    count(*) filter (where currency<>v_currency)
  into v_count,v_debit,v_credit,v_bad_currency
  from public.wallet_ledger
  where journal_id=v_journal_id;

  if v_count<2 then
    raise exception 'WALLET_JOURNAL_NOT_BALANCED: journal % requires at least two ledger entries',v_journal_id
      using errcode='23514';
  end if;
  if v_bad_currency>0 then
    raise exception 'WALLET_JOURNAL_CURRENCY_MISMATCH: journal %',v_journal_id
      using errcode='23514';
  end if;
  if round(v_debit,8)<>round(v_credit,8) then
    raise exception 'WALLET_JOURNAL_UNBALANCED: journal % debit=% credit=%',v_journal_id,v_debit,v_credit
      using errcode='23514';
  end if;

  return null;
end;
$function$;

drop trigger if exists trg_wallet_journal_posted_balance on public.wallet_journals;
create constraint trigger trg_wallet_journal_posted_balance
after insert or update of status on public.wallet_journals
deferrable initially deferred
for each row execute function private.enforce_posted_wallet_journal_balance();

drop trigger if exists trg_wallet_ledger_posted_balance on public.wallet_ledger;
create constraint trigger trg_wallet_ledger_posted_balance
after insert or update or delete on public.wallet_ledger
deferrable initially deferred
for each row execute function private.enforce_posted_wallet_journal_balance();

create table if not exists public.wallet_refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  original_journal_id uuid not null references public.wallet_journals(id) on delete restrict,
  refund_journal_id uuid not null unique references public.wallet_journals(id) on delete restrict,
  amount numeric not null check (amount>0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  idempotency_key text not null unique,
  reason text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists wallet_refunds_created_by_idx on public.wallet_refunds(created_by);
create index if not exists wallet_refunds_order_idx on public.wallet_refunds(order_id);
create index if not exists wallet_refunds_original_journal_idx on public.wallet_refunds(original_journal_id);

alter table public.wallet_journals enable row level security;
alter table public.wallet_refunds enable row level security;

drop policy if exists deny_external_access on public.wallet_journals;
create policy deny_external_access on public.wallet_journals
for all to anon, authenticated using (false) with check (false);

drop policy if exists deny_external_access on public.wallet_refunds;
create policy deny_external_access on public.wallet_refunds
for all to anon, authenticated using (false) with check (false);

revoke all on function private.validate_wallet_journal_balance(uuid) from public, anon, authenticated;
revoke all on function private.enforce_posted_wallet_journal_balance() from public, anon, authenticated;
