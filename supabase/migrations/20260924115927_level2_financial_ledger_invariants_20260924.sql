
-- Double-entry traceability and accounting invariants.
alter table public.wallet_ledger
  add column if not exists journal_id uuid;

create index if not exists wallet_ledger_journal_id_idx
  on public.wallet_ledger(journal_id);

alter table public.settlement_allocations
  add constraint settlement_allocations_amounts_non_negative
  check (
    gross_amount >= 0
    and tax_amount >= 0
    and commission_amount >= 0
    and withholding_amount >= 0
    and net_amount >= 0
  );

alter table public.settlement_allocations
  add constraint settlement_allocations_net_reconciliation
  check (
    round(net_amount,8) =
    round(gross_amount-tax_amount-commission_amount-withholding_amount,8)
  );

create or replace function public.validate_wallet_ledger_currency()
returns trigger
language plpgsql
set search_path=''
as $function$
declare c char(3);
begin
  select currency into c from public.wallet_accounts where id=new.wallet_id;
  if c is null then raise exception 'WALLET_NOT_FOUND'; end if;
  if upper(trim(new.currency::text)) <> upper(trim(c::text)) then
    raise exception 'WALLET_LEDGER_CURRENCY_MISMATCH';
  end if;
  return new;
end
$function$;

drop trigger if exists wallet_ledger_currency_guard on public.wallet_ledger;
create trigger wallet_ledger_currency_guard
before insert or update of wallet_id,currency on public.wallet_ledger
for each row execute function public.validate_wallet_ledger_currency();

-- Internal reconciliation helper. It is deliberately not exposed through the Data API.
create schema if not exists private;

create or replace function private.reconcile_wallet_account(p_wallet_id uuid)
returns table(
  wallet_id uuid,
  ledger_balance numeric,
  stored_available numeric,
  delta numeric,
  currency char(3),
  ledger_entries bigint
)
language sql
security definer
set search_path=''
as $function$
  select
    wa.id,
    coalesce(sum(case when wl.direction='credit' then wl.amount else -wl.amount end),0),
    wa.available_balance,
    round(
      coalesce(sum(case when wl.direction='credit' then wl.amount else -wl.amount end),0)
      - wa.available_balance,8
    ),
    wa.currency,
    count(wl.id)
  from public.wallet_accounts wa
  left join public.wallet_ledger wl on wl.wallet_id=wa.id
  where wa.id=p_wallet_id
  group by wa.id,wa.available_balance,wa.currency
$function$;

revoke all on function private.reconcile_wallet_account(uuid) from public,anon,authenticated;
