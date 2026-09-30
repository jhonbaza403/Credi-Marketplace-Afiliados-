-- End-to-end operation observability.
create table if not exists public.operation_events (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null,
  event_type text not null check (char_length(trim(event_type)) between 2 and 80),
  source text not null check (char_length(trim(source)) between 2 and 80),
  status text not null default 'info' check (status in ('info','pending','success','warning','error')),
  severity text not null default 'normal' check (severity in ('low','normal','high','critical')),
  entity_type text,
  entity_id uuid,
  message text not null check (char_length(trim(message)) between 1 and 500),
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists operation_events_operation_time_idx on public.operation_events(operation_id, occurred_at desc);
create index if not exists operation_events_operation_status_idx on public.operation_events(operation_id, status, occurred_at desc);
alter table public.operation_events enable row level security;
revoke all on public.operation_events from anon, authenticated;

alter table public.conversations add column if not exists operation_id uuid;
create index if not exists conversations_operation_id_idx on public.conversations(operation_id);
alter table public.webhook_events add column if not exists operation_id uuid;
create index if not exists webhook_events_operation_id_idx on public.webhook_events(operation_id, created_at desc);

update public.conversations c set operation_id=o.operation_id
from public.orders o where c.order_id=o.id and c.operation_id is null and o.operation_id is not null;

create or replace function public.record_credi_operation_event(
 p_operation_id uuid,p_event_type text,p_source text,p_status text default 'info',
 p_severity text default 'normal',p_entity_type text default null,p_entity_id uuid default null,
 p_message text default 'Operación registrada',p_error_code text default null,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if p_operation_id is null then return null; end if;
 insert into public.operation_events(operation_id,event_type,source,status,severity,entity_type,entity_id,message,error_code,metadata)
 values(p_operation_id,left(trim(coalesce(p_event_type,'operation')),80),left(trim(coalesce(p_source,'system')),80),
 case when p_status in ('info','pending','success','warning','error') then p_status else 'info' end,
 case when p_severity in ('low','normal','high','critical') then p_severity else 'normal' end,
 nullif(left(trim(coalesce(p_entity_type,'')),80),''),p_entity_id,left(trim(coalesce(p_message,'Operación registrada')),500),
 nullif(left(trim(coalesce(p_error_code,'')),120),''),
 case when jsonb_typeof(coalesce(p_metadata,'{}'::jsonb))='object' then coalesce(p_metadata,'{}'::jsonb) else '{}'::jsonb end)
 returning id into v_id;
 return v_id;
end $$;
revoke execute on function public.record_credi_operation_event(uuid,text,text,text,text,text,uuid,text,text,jsonb) from public,anon,authenticated;

create or replace function public.sync_credi_conversation_operation_id()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.operation_id is null and new.order_id is not null then
   select operation_id into new.operation_id from public.orders where id=new.order_id;
 end if;
 return new;
end $$;
drop trigger if exists trg_sync_conversation_operation_id on public.conversations;
create trigger trg_sync_conversation_operation_id before insert or update of order_id,operation_id on public.conversations
for each row execute function public.sync_credi_conversation_operation_id();
revoke execute on function public.sync_credi_conversation_operation_id() from public,anon,authenticated;

create or replace function public.get_credi_operation_timeline(p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_admin boolean:=false; v_order_id uuid; v_status text:='unknown'; v_errors integer:=0; v_timeline jsonb;
begin
 if v_uid is null or p_operation_id is null then raise exception using errcode='42501',message='No autorizado'; end if;
 select coalesce(platform_owner,false) or role='admin' into v_admin from public.profiles where id=v_uid;
 if not coalesce(v_admin,false) then raise exception using errcode='42501',message='No autorizado'; end if;
 select id,status::text into v_order_id,v_status from public.orders where operation_id=p_operation_id order by created_at limit 1;
 select count(*) into v_errors from (
   select 1 from public.operation_events where operation_id=p_operation_id and status='error'
   union all select 1 from public.webhook_events where operation_id=p_operation_id and status='failed'
 ) e;
 select coalesce(jsonb_agg(x.event order by x.occurred_at,x.id),'[]'::jsonb) into v_timeline from (
   select id,occurred_at,jsonb_build_object('id',id,'occurred_at',occurred_at,'event_type',event_type,'source',source,'status',status,'severity',severity,'entity_type',entity_type,'entity_id',entity_id,'message',message,'error_code',error_code,'metadata',metadata) event from public.operation_events where operation_id=p_operation_id
   union all select id,created_at,jsonb_build_object('id',id,'occurred_at',created_at,'event_type','stripe.webhook','source','webhook_events','status',case when status='processed' then 'success' when status='failed' then 'error' else 'pending' end,'severity',case when status='failed' then 'high' else 'normal' end,'entity_type','webhook','entity_id',id,'message',format('Stripe webhook %s · %s',event_type,status),'error_code',case when status='failed' then 'STRIPE_WEBHOOK_PROCESSING_FAILED' else null end,'metadata',jsonb_build_object('provider',provider,'event_id',event_id,'event_type',event_type,'status',status,'processing_attempts',processing_attempts,'received_at',received_at,'processed_at',processed_at,'failed_at',failed_at,'error_message',case when status='failed' then error_message else null end)) event from public.webhook_events where operation_id=p_operation_id
   union all select id,created_at,jsonb_build_object('id',id,'occurred_at',created_at,'event_type','order.created','source','orders','status','success','severity','normal','entity_type','order','entity_id',id,'message','Orden creada','metadata',jsonb_build_object('order_status',status,'total_amount',total_amount,'currency',currency)) event from public.orders where operation_id=p_operation_id
   union all select h.id,h.created_at,jsonb_build_object('id',h.id,'occurred_at',h.created_at,'event_type','order.status_changed','source','order_status_history','status','success','severity','normal','entity_type','order','entity_id',h.order_id,'message',format('Estado de orden: %s → %s',h.from_status,h.to_status),'metadata',jsonb_build_object('from',h.from_status,'to',h.to_status,'reason',h.reason)) event from public.order_status_history h join public.orders o on o.id=h.order_id where o.operation_id=p_operation_id
   union all select id,created_at,jsonb_build_object('id',id,'occurred_at',created_at,'event_type','payment.orchestration','source','payment_orchestrations','status',case when status in ('failed','cancelled') then 'error' when status in ('paid','succeeded','completed') then 'success' else 'pending' end,'severity',case when status in ('failed','cancelled') then 'high' else 'normal' end,'entity_type','payment','entity_id',id,'message',format('Pago %s',status),'metadata',jsonb_build_object('provider',provider,'method_type',method_type,'status',status,'amount',amount,'currency',currency,'provider_reference',provider_reference)) event from public.payment_orchestrations where operation_id=p_operation_id
   union all select id,created_at,jsonb_build_object('id',id,'occurred_at',created_at,'event_type','affiliate.attribution','source','affiliate_attributions','status','success','severity','normal','entity_type','affiliate_attribution','entity_id',id,'message','Atribución de afiliado registrada','metadata',jsonb_build_object('status',status,'commission_amount',commission_amount,'commission_rate',commission_rate,'referral_code',referral_code)) event from public.affiliate_attributions where operation_id=p_operation_id
   union all select id,created_at,jsonb_build_object('id',id,'occurred_at',created_at,'event_type','affiliate.commission','source','affiliate_commission_ledger','status',case when status in ('reversed','void') then 'error' when status in ('paid','approved') then 'success' else 'pending' end,'severity',case when status in ('reversed','void') then 'high' else 'normal' end,'entity_type','affiliate_commission','entity_id',id,'message',format('Comisión de afiliado %s',status),'metadata',jsonb_build_object('status',status,'commission_amount',commission_amount,'gross_amount',gross_amount,'currency',currency)) event from public.affiliate_commission_ledger where operation_id=p_operation_id
   union all select id,created_at,jsonb_build_object('id',id,'occurred_at',created_at,'event_type','settlement.allocation','source','settlement_allocations','status',case when status in ('reversed','refunded','void') then 'error' when status='paid' then 'success' else 'pending' end,'severity',case when status in ('reversed','refunded','void') then 'high' else 'normal' end,'entity_type','settlement','entity_id',id,'message',format('Settlement %s',status),'metadata',jsonb_build_object('status',status,'beneficiary_role',beneficiary_role,'gross_amount',gross_amount,'net_amount',net_amount,'currency',currency)) event from public.settlement_allocations where operation_id=p_operation_id
   union all select id,created_at,jsonb_build_object('id',id,'occurred_at',created_at,'event_type','wallet.ledger','source','wallet_ledger','status','success','severity','normal','entity_type','wallet_entry','entity_id',id,'message',format('Wallet %s %s',direction,amount),'metadata',jsonb_build_object('direction',direction,'amount',amount,'currency',currency,'entry_type',entry_type,'reference_type',reference_type,'reference_id',reference_id)) event from public.wallet_ledger where operation_id=p_operation_id
   union all select id,created_at,jsonb_build_object('id',id,'occurred_at',created_at,'event_type','notification.emitted','source','notifications','status','success','severity',case when priority='critical' then 'critical' when priority='high' then 'high' else 'normal' end,'entity_type',entity_type,'entity_id',entity_id,'message',title,'metadata',jsonb_build_object('type',type,'priority',priority,'dedupe_key',dedupe_key)) event from public.notifications where operation_id=p_operation_id
   union all select id,occurred_at,jsonb_build_object('id',id,'occurred_at',occurred_at,'event_type','commerce.event','source','commerce_events','status','success','severity','normal','entity_type','product','entity_id',product_id,'message',format('Evento comercial: %s',event_type),'metadata',jsonb_build_object('event_type',event_type,'amount',amount,'currency',currency,'session_id',session_id)) event from public.commerce_events where operation_id=p_operation_id
 ) x;
 return jsonb_build_object('operation_id',p_operation_id,'status',v_status,'error_count',v_errors,'order_id',v_order_id,'timeline',v_timeline);
end $$;
revoke execute on function public.get_credi_operation_timeline(uuid) from public,anon;
grant execute on function public.get_credi_operation_timeline(uuid) to authenticated;
