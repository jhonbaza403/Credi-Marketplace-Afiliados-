create or replace function public.wallet_pay_order(p_order_id uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare u uuid:=(select auth.uid()); o public.orders; b public.wallet_accounts; w public.wallet_accounts; k text; old jsonb; a numeric; c text; rl record;
begin
 if u is null then raise exception 'UNAUTHORIZED'; end if;
 select * into rl from public.consume_api_rate_limit('wallet_pay_order:'||u::text,10,60); if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;
 if p_order_id is null or p_idempotency_key is null or length(trim(p_idempotency_key))<16 or length(trim(p_idempotency_key))>200 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
 k:='wallet_order:'||u::text||':'||p_order_id::text||':'||trim(p_idempotency_key);
 select * into o from public.orders where id=p_order_id and buyer_id=u for update; if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 if o.status<>'pending' or o.payment_status<>'pending' then raise exception 'ORDER_NOT_PAYABLE'; end if;
 a:=round(o.total_amount,8); c:=upper(trim(coalesce(o.currency,'USD'))); if a<=0 then raise exception 'INVALID_ORDER_TOTAL'; end if;
 select jsonb_build_object('status','succeeded','amount',amount,'currency',currency) into old from public.wallet_ledger where idempotency_key=k limit 1; if old is not null then return old; end if;
 insert into public.wallet_accounts(user_id,currency) values(u,c) on conflict(user_id) do nothing;
 select * into b from public.wallet_accounts where user_id=u for update; if b.currency<>c or b.status<>'active' then raise exception 'WALLET_NOT_ACTIVE'; end if; if b.available_balance<a then raise exception 'INSUFFICIENT_FUNDS'; end if;
 select wa.* into w from public.wallet_accounts wa join public.profiles p on p.id=wa.user_id where p.platform_owner=true and wa.currency=c and wa.status='active' order by wa.created_at limit 1 for update; if not found or w.id=b.id then raise exception 'PLATFORM_WALLET_NOT_CONFIGURED'; end if;
 update public.wallet_accounts set available_balance=available_balance-a,updated_at=now() where id=b.id;
 update public.wallet_accounts set available_balance=available_balance+a,updated_at=now() where id=w.id;
 insert into public.wallet_ledger(wallet_id,direction,amount,currency,entry_type,reference_type,reference_id,idempotency_key,metadata) values(b.id,'debit',a,c,'order_payment','order',o.id,k,jsonb_build_object('order_id',o.id,'rail','wallet'));
 insert into public.wallet_ledger(wallet_id,direction,amount,currency,entry_type,reference_type,reference_id,idempotency_key,metadata) values(w.id,'credit',a,c,'order_receipt','order',o.id,k||':platform',jsonb_build_object('order_id',o.id,'buyer_id',u,'rail','wallet'));
 update public.payment_orchestrations set status='succeeded',provider='wallet',provider_reference=k,updated_at=now() where order_id=o.id and user_id=u and method_type='wallet' and idempotency_key is not distinct from p_idempotency_key;
 update public.orders set status='paid',payment_status='paid',paid_at=now(),updated_at=now() where id=o.id and status='pending' and payment_status='pending'; if not found then raise exception 'ORDER_UPDATE_FAILED'; end if;
 insert into public.order_status_history(order_id,from_status,to_status,changed_by,reason,metadata) values(o.id,'pending','paid',u,'wallet_payment',jsonb_build_object('rail','wallet','idempotency_key',k));
 insert into public.commerce_events(user_id,event_type,amount,currency,metadata) values(u,'order_paid',a,c,jsonb_build_object('provider','wallet','order_id',o.id,'idempotency_key',k));
 return jsonb_build_object('status','succeeded','amount',a,'currency',c);
end;$function$;
