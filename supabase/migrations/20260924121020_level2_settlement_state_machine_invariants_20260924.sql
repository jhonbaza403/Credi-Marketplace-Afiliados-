alter table public.settlement_allocations
  add constraint settlement_allocations_currency_format check (currency ~ '^[A-Z]{3}$'),
  add constraint settlement_allocations_status_check check (status in ('pending','approved','paid','reversed','refunded','void')),
  add constraint settlement_allocations_beneficiary_role_check check (beneficiary_role in ('seller','platform','affiliate','government','provider','other'));

create or replace function private.guard_settlement_allocation_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status in ('paid','reversed','refunded','void') then
      if new.order_id is distinct from old.order_id
         or new.tax_transaction_id is distinct from old.tax_transaction_id
         or new.beneficiary_id is distinct from old.beneficiary_id
         or new.beneficiary_role is distinct from old.beneficiary_role
         or new.gross_amount is distinct from old.gross_amount
         or new.tax_amount is distinct from old.tax_amount
         or new.commission_amount is distinct from old.commission_amount
         or new.withholding_amount is distinct from old.withholding_amount
         or new.net_amount is distinct from old.net_amount
         or new.currency is distinct from old.currency
         or new.snapshot is distinct from old.snapshot then
        raise exception 'settlement allocation is immutable after terminal status';
      end if;
    end if;

    if old.status = 'pending' and new.status not in ('pending','approved','void') then
      raise exception 'invalid settlement transition from pending to %', new.status;
    end if;
    if old.status = 'approved' and new.status not in ('approved','paid','void') then
      raise exception 'invalid settlement transition from approved to %', new.status;
    end if;
    if old.status = 'paid' and new.status not in ('paid','reversed','refunded') then
      raise exception 'invalid settlement transition from paid to %', new.status;
    end if;
  end if;

  if new.gross_amount < new.tax_amount + new.commission_amount + new.withholding_amount then
    raise exception 'settlement deductions exceed gross amount';
  end if;

  return new;
end;
$$;

drop trigger if exists settlement_allocation_integrity_guard on public.settlement_allocations;
create trigger settlement_allocation_integrity_guard
before update or insert on public.settlement_allocations
for each row execute function private.guard_settlement_allocation_integrity();

revoke all on function private.guard_settlement_allocation_integrity() from public, anon, authenticated;
