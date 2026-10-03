
create or replace function public.emit_credi_core_operation_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_operation_id uuid;
declare v_status text;
begin
  v_operation_id := case TG_TABLE_NAME
    when 'orders' then coalesce(new.operation_id,old.operation_id)
    when 'payment_orchestrations' then coalesce(new.operation_id,old.operation_id)
    when 'affiliate_attributions' then coalesce(new.operation_id,old.operation_id)
    when 'affiliate_commission_ledger' then coalesce(new.operation_id,old.operation_id)
    when 'settlement_allocations' then coalesce(new.operation_id,old.operation_id)
    when 'wallet_ledger' then coalesce(new.operation_id,old.operation_id)
    when 'commerce_events' then coalesce(new.operation_id,old.operation_id)
    when 'notifications' then coalesce(new.operation_id,old.operation_id)
    else null
  end;
  if v_operation_id is null then return coalesce(new,old); end if;

  v_status := case
    when TG_TABLE_NAME='payment_orchestrations' and coalesce(new.status,old.status) in ('failed','cancelled') then 'error'
    when TG_TABLE_NAME='affiliate_commission_ledger' and coalesce(new.status,old.status) in ('reversed','void') then 'error'
    when TG_TABLE_NAME='settlement_allocations' and coalesce(new.status,old.status) in ('reversed','refunded','void') then 'error'
    else 'info'
  end;

  perform public.record_credi_operation_event(
    v_operation_id,
    lower(replace(TG_TABLE_NAME,'_','.')) || '.' || lower(TG_OP),
    TG_TABLE_NAME,
    v_status,
    case when v_status='error' then 'high' else 'normal' end,
    TG_TABLE_NAME,
    coalesce(new.id,old.id),
    format('%s %s',TG_TABLE_NAME,lower(TG_OP)),
    null,
    jsonb_build_object('operation','trigger','table',TG_TABLE_NAME)
  );
  return coalesce(new,old);
end $$;
