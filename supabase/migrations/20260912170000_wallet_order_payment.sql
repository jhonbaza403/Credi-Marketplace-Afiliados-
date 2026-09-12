create or replace function public.wallet_pay_order(p_order_id uuid, p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user uuid := auth.uid();
  v_order public.orders;
  v_buyer public.wallet_accounts;
  v_platform public.wallet_accounts;
  v_key text;
  v_existing jsonb;
  v_amount numeric;
  v_currency text;
begin
  if v_user is null then raise exception 'UNAUTHORIZED'; end if;
  v_key := coalesce(nullif(trim(p_idempotency_key), ''), 'wallet_order_' || p_order_id::text || '_' || v_user::text);
  select * into v_order from public.orders where id = p_order_id and buyer_id = v_user for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status <> 'pending' or v_order.payment_status <> 'pending' then raise exception 'ORDER_NOT_PAYABLE'; end if;
  v_amount := round(v_order.total_amount, 8);
  v_currency := upper(trim(coalesce(v_order.currency, 'USD')));
  if v_amount <= 0 then raise exception 'INVALID_ORDER_TOTAL'; end if;
  select jsonb_build_object('status','succeeded','amount',amount,'currency',currency) into v_existing from public.wallet_ledger where idempotency_key = v_key limit 1;
  if v_existing is not null then return v_existing; end if;
  insert into public.wallet_accounts(user_id,currency) values(v_user,v_currency) on conflict(user_id) do nothing;
  select * into v_buyer from public.wallet_accounts where user_id=v_user for update;
  if v_buyer.currency <> v_currency or v_buyer.status <> 'active' then raise exception 'WALLET_NOT_ACTIVE'; end if;
  if v_buyer.available_balance < v_amount then raise exception 'INSUFFICIENT_FUNDS'; end if;
  select w.* into v_platform from public.wallet_accounts w join public.profiles p on p.id=w.user_id where p.platform_owner = true and w.currency=v_currency and w.status='active' and w.user_id <> v_user order by w.created_at limit 1 for update;
  if not found then raise exception 'PLATFORM_WALLET_NOT_CONFIGURED'; end if;
  update public.wallet_accounts set available_balance = available_balance - v_amount, updated_at=now() where id=v_buyer.id;
  update public.wallet_accounts set available_balance = available_balance + v_amount, updated_at=now() where id=v_platform.id;
  insert into public.wallet_ledger(wallet_id,direction,amount,currency,entry_type,reference_type,reference_id,idempotency_key,metadata)
  values(v_buyer.id,'debit',v_amount,v_currency,'order_payment','order',v_order.id,v_key,jsonb_build_object('order_id',v_order.id,'rail','wallet'));
  insert into public.wallet_ledger(wallet_id,direction,amount,currency,entry_type,reference_type,reference_id,idempotency_key,metadata)
  values(v_platform.id,'credit',v_amount,v_currency,'order_receipt','order',v_order.id,v_key||':platform',jsonb_build_object('order_id',v_order.id,'buyer_id',v_user,'rail','wallet'));
  update public.payment_orchestrations set status='succeeded', provider='wallet', provider_reference=v_key, updated_at=now() where order_id=v_order.id and user_id=v_user and method_type='wallet' and idempotency_key=v_key;
  update public.orders set status='paid', payment_status='paid', paid_at=now(), updated_at=now() where id=v_order.id and status='pending' and payment_status='pending';
  insert into public.order_status_history(order_id,from_status,to_status,changed_by,reason,metadata) values(v_order.id,'pending','paid',v_user,'wallet_payment',jsonb_build_object('rail','wallet','idempotency_key',v_key));
  insert into public.commerce_events(user_id,event_type,amount,currency,metadata) values(v_user,'order_paid',v_amount,v_currency,jsonb_build_object('provider','wallet','order_id',v_order.id,'idempotency_key',v_key));
  return jsonb_build_object('status','succeeded','amount',v_amount,'currency',v_currency);
end
$function$;

grant execute on function public.wallet_pay_order(uuid,text) to authenticated;
