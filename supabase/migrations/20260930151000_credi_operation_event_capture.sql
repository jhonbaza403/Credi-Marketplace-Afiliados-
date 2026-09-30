create or replace function public.emit_credi_core_operation_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_operation_id uuid; v_status text;
begin
 v_operation_id:=case TG_TABLE_NAME
  when 'orders' then coalesce(new.operation_id,old.operation_id)
  when 'payment_orchestrations' then coalesce(new.operation_id,old.operation_id)
  when 'affiliate_attributions' then coalesce(new.operation_id,old.operation_id)
  when 'affiliate_commission_ledger' then coalesce(new.operation_id,old.operation_id)
  when 'settlement_allocations' then coalesce(new.operation_id,old.operation_id)
  when 'wallet_ledger' then coalesce(new.operation_id,old.operation_id)
  when 'commerce_events' then coalesce(new.operation_id,old.operation_id)
  when 'notifications' then coalesce(new.operation_id,old.operation_id)
  else null end;
 if v_operation_id is null then return coalesce(new,old); end if;
 v_status:=case
  when TG_TABLE_NAME='payment_orchestrations' and coalesce(new.status,old.status) in ('failed','cancelled') then 'error'
  when TG_TABLE_NAME='affiliate_commission_ledger' and coalesce(new.status,old.status) in ('reversed','void') then 'error'
  when TG_TABLE_NAME='settlement_allocations' and coalesce(new.status,old.status) in ('reversed','refunded','void') then 'error'
  else 'info' end;
 perform public.record_credi_operation_event(v_operation_id,lower(replace(TG_TABLE_NAME,'_','.'))||'.'||lower(TG_OP),TG_TABLE_NAME,v_status,case when v_status='error' then 'high' else 'normal' end,TG_TABLE_NAME,coalesce(new.id,old.id),format('%s %s',TG_TABLE_NAME,lower(TG_OP)),null,jsonb_build_object('operation','trigger','table',TG_TABLE_NAME));
 return coalesce(new,old);
end $$;
revoke execute on function public.emit_credi_core_operation_event() from public,anon,authenticated;

drop trigger if exists trg_operation_event_orders on public.orders;
create trigger trg_operation_event_orders after insert or update of status,payment_status,operation_id on public.orders for each row execute function public.emit_credi_core_operation_event();
drop trigger if exists trg_operation_event_payments on public.payment_orchestrations;
create trigger trg_operation_event_payments after insert or update of status,operation_id on public.payment_orchestrations for each row execute function public.emit_credi_core_operation_event();
drop trigger if exists trg_operation_event_affiliate_attr on public.affiliate_attributions;
create trigger trg_operation_event_affiliate_attr after insert or update of status,operation_id on public.affiliate_attributions for each row execute function public.emit_credi_core_operation_event();
drop trigger if exists trg_operation_event_affiliate_commission on public.affiliate_commission_ledger;
create trigger trg_operation_event_affiliate_commission after insert or update of status,operation_id on public.affiliate_commission_ledger for each row execute function public.emit_credi_core_operation_event();
drop trigger if exists trg_operation_event_settlement on public.settlement_allocations;
create trigger trg_operation_event_settlement after insert or update of status,operation_id on public.settlement_allocations for each row execute function public.emit_credi_core_operation_event();
drop trigger if exists trg_operation_event_wallet on public.wallet_ledger;
create trigger trg_operation_event_wallet after insert or update of operation_id on public.wallet_ledger for each row execute function public.emit_credi_core_operation_event();
drop trigger if exists trg_operation_event_commerce on public.commerce_events;
create trigger trg_operation_event_commerce after insert or update of operation_id on public.commerce_events for each row execute function public.emit_credi_core_operation_event();
drop trigger if exists trg_operation_event_notifications on public.notifications;
create trigger trg_operation_event_notifications after insert or update of operation_id on public.notifications for each row execute function public.emit_credi_core_operation_event();
