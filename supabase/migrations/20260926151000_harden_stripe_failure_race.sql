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
  v_payment public.payment_orchestrations%rowtype;
begin
  if p_order_id is null or p_session_id is null or length(trim(p_session_id)) < 3 then
    raise exception 'INVALID_STRIPE_FAILURE_INPUT' using errcode='22023';
  end if;

  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  select * into v_payment
    from public.payment_orchestrations
   where provider='stripe' and provider_reference=p_session_id
   for update;

  if not found then raise exception 'PAYMENT_ORCHESTRATION_NOT_FOUND'; end if;
  if v_payment.order_id <> v_order.id then raise exception 'PAYMENT_ORDER_MISMATCH'; end if;

  if v_payment.status='succeeded' then
    return jsonb_build_object('status','payment_already_succeeded','order_id',v_order.id,'payment_orchestration_id',v_payment.id);
  end if;

  if v_order.status in ('paid','processing','shipped','delivered','completed','refunded') then
    return jsonb_build_object('status','already_paid_or_progressed','order_id',v_order.id);
  end if;

  if v_order.status='pending' and v_order.payment_status='pending' then
    update public.orders
       set status='failed', payment_status='failed', updated_at=now()
     where id=v_order.id and status='pending' and payment_status='pending';

    if found then
      perform public.settle_order_inventory(v_order.id,'failed');
    end if;
  end if;

  update public.payment_orchestrations
     set status='failed', updated_at=now()
   where id=v_payment.id and status <> 'succeeded';

  return jsonb_build_object('status','failed','order_id',v_order.id);
end;
$function$;

revoke all on function public.process_stripe_checkout_failure(uuid,text) from public, anon, authenticated;
grant execute on function public.process_stripe_checkout_failure(uuid,text) to service_role;
