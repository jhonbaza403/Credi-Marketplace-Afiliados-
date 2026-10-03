
create or replace function public.process_stripe_checkout_session(
  p_order_id uuid,
  p_session_id text,
  p_event_id text,
  p_amount_total bigint,
  p_currency text,
  p_buyer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_order public.orders%rowtype;
  v_payment public.payment_orchestrations%rowtype;
  v_currency text;
  v_now timestamptz := now();
begin
  if p_order_id is null or p_session_id is null or length(trim(p_session_id)) < 3
     or p_event_id is null or length(trim(p_event_id)) < 3
     or p_amount_total is null or p_amount_total < 0
     or p_currency is null or length(trim(p_currency)) <> 3
     or p_buyer_id is null then
    raise exception 'INVALID_STRIPE_CHECKOUT_INPUT' using errcode='22023';
  end if;

  v_currency := upper(trim(p_currency));

  select * into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.buyer_id <> p_buyer_id then raise exception 'STRIPE_BUYER_MISMATCH'; end if;
  if p_amount_total <> round(v_order.total_amount * 100)::bigint then
    raise exception 'STRIPE_AMOUNT_MISMATCH';
  end if;
  if v_currency <> upper(trim(v_order.currency::text)) then
    raise exception 'STRIPE_CURRENCY_MISMATCH';
  end if;

  select * into v_payment
    from public.payment_orchestrations
   where provider='stripe'
     and provider_reference=p_session_id
   for update;

  if not found then raise exception 'PAYMENT_ORCHESTRATION_NOT_FOUND'; end if;
  if v_payment.order_id <> v_order.id then raise exception 'PAYMENT_ORDER_MISMATCH'; end if;
  if v_payment.user_id <> v_order.buyer_id then raise exception 'PAYMENT_BUYER_MISMATCH'; end if;

  if v_order.status = 'paid' and v_order.payment_status = 'paid' and v_payment.status = 'succeeded' then
    return jsonb_build_object(
      'status','already_processed',
      'order_id',v_order.id,
      'payment_orchestration_id',v_payment.id
    );
  end if;

  if v_order.status <> 'pending' or v_order.payment_status <> 'pending' then
    raise exception 'ORDER_NOT_PAYABLE_STATE';
  end if;

  if v_payment.status not in ('pending','processing','requires_action') then
    raise exception 'PAYMENT_NOT_PAYABLE_STATE';
  end if;

  update public.payment_orchestrations
     set status='succeeded',
         provider_reference=p_session_id,
         updated_at=v_now
   where id=v_payment.id;

  update public.orders
     set status='paid',
         payment_status='paid',
         paid_at=coalesce(paid_at,v_now),
         updated_at=v_now
   where id=v_order.id
     and status='pending'
     and payment_status='pending';

  if not found then
    raise exception 'ORDER_STATE_RACE';
  end if;

  perform public.settle_order_inventory(v_order.id,'paid');

  insert into public.commerce_events(
    user_id, event_type, amount, currency, metadata
  ) values (
    v_order.buyer_id,
    'order_paid',
    v_order.total_amount,
    v_order.currency,
    jsonb_build_object(
      'provider','stripe',
      'session_id',p_session_id,
      'webhook_event_id',p_event_id
    )
  );

  return jsonb_build_object(
    'status','processed',
    'order_id',v_order.id,
    'payment_orchestration_id',v_payment.id
  );
end;
$function$;

create or replace function public.process_stripe_checkout_failure(
  p_order_id uuid,
  p_session_id text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_order public.orders%rowtype;
begin
  if p_order_id is null or p_session_id is null or length(trim(p_session_id)) < 3 then
    raise exception 'INVALID_STRIPE_FAILURE_INPUT' using errcode='22023';
  end if;

  select * into v_order
    from public.orders
   where id=p_order_id
   for update;

  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if v_order.status in ('paid','processing','shipped','delivered','completed','refunded') then
    return jsonb_build_object('status','already_paid_or_progressed','order_id',v_order.id);
  end if;

  if v_order.status='pending' and v_order.payment_status='pending' then
    update public.orders
       set status='failed',
           payment_status='failed',
           updated_at=now()
     where id=v_order.id
       and status='pending'
       and payment_status='pending';

    perform public.settle_order_inventory(v_order.id,'failed');
  end if;

  update public.payment_orchestrations
     set status='failed',
         updated_at=now()
   where provider='stripe'
     and provider_reference=p_session_id
     and status <> 'succeeded';

  return jsonb_build_object('status','failed','order_id',v_order.id);
end;
$function$;

revoke all on function public.process_stripe_checkout_session(uuid,text,text,bigint,text,uuid) from public, anon, authenticated;
grant execute on function public.process_stripe_checkout_session(uuid,text,text,bigint,text,uuid) to service_role;

revoke all on function public.process_stripe_checkout_failure(uuid,text) from public, anon, authenticated;
grant execute on function public.process_stripe_checkout_failure(uuid,text) to service_role;
