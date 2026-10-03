
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

create index if not exists operation_events_operation_time_idx
  on public.operation_events(operation_id, occurred_at desc);
create index if not exists operation_events_operation_status_idx
  on public.operation_events(operation_id, status, occurred_at desc);
create index if not exists operation_events_error_idx
  on public.operation_events(operation_id, severity, occurred_at desc)
  where status='error';

alter table public.operation_events enable row level security;
revoke all on public.operation_events from anon, authenticated;

create or replace function public.record_credi_operation_event(
  p_operation_id uuid,
  p_event_type text,
  p_source text,
  p_status text default 'info',
  p_severity text default 'normal',
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_message text default 'Operación registrada',
  p_error_code text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if p_operation_id is null then return null; end if;
  insert into public.operation_events(
    operation_id,event_type,source,status,severity,entity_type,entity_id,message,error_code,metadata
  ) values (
    p_operation_id,
    left(trim(coalesce(p_event_type,'operation')),80),
    left(trim(coalesce(p_source,'system')),80),
    case when p_status in ('info','pending','success','warning','error') then p_status else 'info' end,
    case when p_severity in ('low','normal','high','critical') then p_severity else 'normal' end,
    nullif(left(trim(coalesce(p_entity_type,'')),80),''),
    p_entity_id,
    left(trim(coalesce(p_message,'Operación registrada')),500),
    nullif(left(trim(coalesce(p_error_code,'')),120),''),
    case when jsonb_typeof(coalesce(p_metadata,'{}'::jsonb))='object' then coalesce(p_metadata,'{}'::jsonb) else '{}'::jsonb end
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.record_credi_operation_event(uuid,text,text,text,text,text,uuid,text,text,jsonb) from public, anon, authenticated;

create or replace function public.get_credi_operation_timeline(p_operation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_order public.orders%rowtype;
  v_timeline jsonb;
  v_errors integer := 0;
  v_last_status text := 'unknown';
begin
  if v_uid is null or p_operation_id is null then
    raise exception using errcode='42501', message='No autorizado';
  end if;

  select coalesce(p.platform_owner,false) or p.role='admin'
    into v_is_admin
  from public.profiles p
  where p.id=v_uid;

  if not coalesce(v_is_admin,false) then
    raise exception using errcode='42501', message='No autorizado';
  end if;

  select * into v_order
  from public.orders
  where operation_id=p_operation_id
  order by created_at asc
  limit 1;

  select count(*) into v_errors
  from public.operation_events
  where operation_id=p_operation_id and status='error';

  if v_order.id is not null then
    v_last_status := coalesce(v_order.status::text, v_order.payment_status, 'unknown');
  end if;

  select coalesce(jsonb_agg(e.event order by e.occurred_at asc, e.id asc),'[]'::jsonb)
    into v_timeline
  from (
    select oe.id, oe.occurred_at,
      jsonb_build_object(
        'id',oe.id,'occurred_at',oe.occurred_at,'event_type',oe.event_type,'source',oe.source,
        'status',oe.status,'severity',oe.severity,'entity_type',oe.entity_type,'entity_id',oe.entity_id,
        'message',oe.message,'error_code',oe.error_code,'metadata',oe.metadata
      ) event
    from public.operation_events oe
    where oe.operation_id=p_operation_id

    union all
    select o.id,o.created_at,
      jsonb_build_object('id',o.id,'occurred_at',o.created_at,'event_type','order.created','source','orders',
        'status','success','severity','normal','entity_type','order','entity_id',o.id,
        'message','Orden creada','metadata',jsonb_build_object('order_status',o.status,'total_amount',o.total_amount,'currency',o.currency))
    from public.orders o where o.operation_id=p_operation_id

    union all
    select h.id,h.created_at,
      jsonb_build_object('id',h.id,'occurred_at',h.created_at,'event_type','order.status_changed','source','order_status_history',
        'status','success','severity','normal','entity_type','order','entity_id',h.order_id,
        'message',format('Estado de orden: %s → %s',h.from_status,h.to_status),
        'metadata',jsonb_build_object('from',h.from_status,'to',h.to_status,'reason',h.reason))
    from public.order_status_history h
    join public.orders o on o.id=h.order_id
    where o.operation_id=p_operation_id

    union all
    select p.id,p.created_at,
      jsonb_build_object('id',p.id,'occurred_at',p.created_at,'event_type','payment.orchestration','source','payment_orchestrations',
        'status',case when p.status in ('failed','cancelled') then 'error' when p.status in ('paid','succeeded','completed') then 'success' else 'pending' end,
        'severity',case when p.status in ('failed','cancelled') then 'high' else 'normal' end,
        'entity_type','payment','entity_id',p.id,'message',format('Pago %s',p.status),
        'metadata',jsonb_build_object('provider',p.provider,'method_type',p.method_type,'status',p.status,'amount',p.amount,'currency',p.currency,'provider_reference',p.provider_reference))
    from public.payment_orchestrations p where p.operation_id=p_operation_id

    union all
    select a.id,a.created_at,
      jsonb_build_object('id',a.id,'occurred_at',a.created_at,'event_type','affiliate.attribution','source','affiliate_attributions',
        'status','success','severity','normal','entity_type','affiliate_attribution','entity_id',a.id,
        'message','Atribución de afiliado registrada',
        'metadata',jsonb_build_object('status',a.status,'commission_amount',a.commission_amount,'commission_rate',a.commission_rate,'referral_code',a.referral_code))
    from public.affiliate_attributions a where a.operation_id=p_operation_id

    union all
    select c.id,c.created_at,
      jsonb_build_object('id',c.id,'occurred_at',c.created_at,'event_type','affiliate.commission','source','affiliate_commission_ledger',
        'status',case when c.status in ('reversed','void') then 'error' when c.status in ('paid','approved') then 'success' else 'pending' end,
        'severity',case when c.status in ('reversed','void') then 'high' else 'normal' end,
        'entity_type','affiliate_commission','entity_id',c.id,'message',format('Comisión de afiliado %s',c.status),
        'metadata',jsonb_build_object('status',c.status,'commission_amount',c.commission_amount,'gross_amount',c.gross_amount,'currency',c.currency))
    from public.affiliate_commission_ledger c where c.operation_id=p_operation_id

    union all
    select s.id,s.created_at,
      jsonb_build_object('id',s.id,'occurred_at',s.created_at,'event_type','settlement.allocation','source','settlement_allocations',
        'status',case when s.status in ('reversed','refunded','void') then 'error' when s.status='paid' then 'success' else 'pending' end,
        'severity',case when s.status in ('reversed','refunded','void') then 'high' else 'normal' end,
        'entity_type','settlement','entity_id',s.id,'message',format('Settlement %s',s.status),
        'metadata',jsonb_build_object('status',s.status,'beneficiary_role',s.beneficiary_role,'gross_amount',s.gross_amount,'net_amount',s.net_amount,'currency',s.currency))
    from public.settlement_allocations s where s.operation_id=p_operation_id

    union all
    select w.id,w.created_at,
      jsonb_build_object('id',w.id,'occurred_at',w.created_at,'event_type','wallet.ledger','source','wallet_ledger',
        'status','success','severity','normal','entity_type','wallet_entry','entity_id',w.id,
        'message',format('Wallet %s %s',w.direction,w.amount),
        'metadata',jsonb_build_object('direction',w.direction,'amount',w.amount,'currency',w.currency,'entry_type',w.entry_type,'reference_type',w.reference_type,'reference_id',w.reference_id))
    from public.wallet_ledger w where w.operation_id=p_operation_id

    union all
    select n.id,n.created_at,
      jsonb_build_object('id',n.id,'occurred_at',n.created_at,'event_type','notification.emitted','source','notifications',
        'status','success','severity',case when n.priority='critical' then 'critical' when n.priority='high' then 'high' else 'normal' end,
        'entity_type',n.entity_type,'entity_id',n.entity_id,'message',n.title,
        'metadata',jsonb_build_object('type',n.type,'priority',n.priority,'dedupe_key',n.dedupe_key))
    from public.notifications n where n.operation_id=p_operation_id

    union all
    select ce.id,ce.occurred_at,
      jsonb_build_object('id',ce.id,'occurred_at',ce.occurred_at,'event_type','commerce.event','source','commerce_events',
        'status','success','severity','normal','entity_type','product','entity_id',ce.product_id,
        'message',format('Evento comercial: %s',ce.event_type),
        'metadata',jsonb_build_object('event_type',ce.event_type,'amount',ce.amount,'currency',ce.currency,'session_id',ce.session_id))
    from public.commerce_events ce where ce.operation_id=p_operation_id
  ) e;

  return jsonb_build_object(
    'operation_id',p_operation_id,
    'status',v_last_status,
    'error_count',v_errors,
    'order_id',v_order.id,
    'timeline',v_timeline
  );
end;
$$;

revoke execute on function public.get_credi_operation_timeline(uuid) from public, anon;
grant execute on function public.get_credi_operation_timeline(uuid) to authenticated;
