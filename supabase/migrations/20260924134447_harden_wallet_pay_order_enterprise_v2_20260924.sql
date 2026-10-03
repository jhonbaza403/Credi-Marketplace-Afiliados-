create or replace function private.wallet_pay_order(p_order_id uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare
 u uuid := (select auth.uid());
 o public.orders; b public.wallet_accounts; w public.wallet_accounts; po public.payment_orchestrations;
 existing_ledger_id uuid; existing_amount numeric; existing_currency text; existing_journal_id uuid; existing_journal_status text; existing_journal_type text; existing_ref_type text; existing_ref_id uuid;
 k text; raw_key text; a numeric; c text; j uuid; rl record;
begin
 if u is null then raise exception 'UNAUTHORIZED' using errcode='42501'; end if;
 select * into rl from public.consume_api_rate_limit('wallet_pay_order:'||u::text,10,60);
 if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;
 raw_key:=trim(coalesce(p_idempotency_key,''));
 if p_order_id is null or length(raw_key)<16 or length(raw_key)>200 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
 k:='wallet_order:'||u::text||':'||p_order_id::text||':'||raw_key;
 perform pg_advisory_xact_lock(hashtextextended(k,0));

 select * into o from public.orders where id=p_order_id and buyer_id=u for update;
 if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 if o.status<>'pending' or o.payment_status<>'pending' then raise exception 'ORDER_NOT_PAYABLE'; end if;

 a:=round(o.total_amount,8); c:=upper(trim(coalesce(o.currency::text,'')));
 if a<=0 then raise exception 'INVALID_ORDER_TOTAL'; end if;
 if c !~ '^[A-Z]{3}$' then raise exception 'INVALID_ORDER_CURRENCY'; end if;

 select * into po from public.payment_orchestrations where idempotency_key=raw_key for update;
 if found then
   if po.user_id<>u or po.order_id is distinct from o.id or po.method_type<>'wallet' then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
   if round(po.amount,8)<>a or upper(trim(po.currency::text))<>c then raise exception 'PAYMENT_INTENT_MISMATCH'; end if;
   if po.status not in ('created','pending','requires_action','succeeded') then raise exception 'PAYMENT_INTENT_NOT_PAYABLE'; end if;
 end if;

 select wl.id,wl.amount,wl.currency::text,wl.journal_id,wj.status,wj.journal_type,wj.reference_type,wj.reference_id
 into existing_ledger_id,existing_amount,existing_currency,existing_journal_id,existing_journal_status,existing_journal_type,existing_ref_type,existing_ref_id
 from public.wallet_ledger wl join public.wallet_journals wj on wj.id=wl.journal_id
 where wl.idempotency_key=k and wl.direction='debit'
 order by wl.created_at desc limit 1;

 if existing_ledger_id is not null then
   if existing_amount<>a or upper(trim(existing_currency))<>c then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
   if existing_journal_status='posted' and existing_journal_type='payment' and existing_ref_type='order' and existing_ref_id=o.id then
     return jsonb_build_object('status','succeeded','amount',a,'currency',c,'journal_id',existing_journal_id);
   end if;
   raise exception 'IDEMPOTENCY_KEY_REUSED';
 end if;

 insert into public.wallet_accounts(user_id,currency) values(u,c) on conflict(user_id,currency) do nothing;
 select * into b from public.wallet_accounts where user_id=u and currency=c for update;
 if b.status<>'active' then raise exception 'WALLET_NOT_ACTIVE'; end if;
 if b.available_balance<a then raise exception 'INSUFFICIENT_FUNDS'; end if;

 select wa.* into w
 from public.settlement_account_bindings sb join public.wallet_accounts wa on wa.id=sb.wallet_account_id
 where sb.beneficiary_role='platform' and upper(trim(sb.currency::text))=c and sb.active=true and wa.status='active' and upper(trim(wa.currency::text))=c
 for update;
 if not found then raise exception 'PLATFORM_REVENUE_ACCOUNT_NOT_CONFIGURED'; end if;
 if w.id=b.id then raise exception 'INVALID_PAYMENT_WALLET'; end if;

 insert into public.wallet_journals(currency,journal_type,reference_type,reference_id,idempotency_key,status,metadata)
 values(c,'payment','order',o.id,k,'posted',jsonb_build_object('engine_version','3.2.0','order_id',o.id,'buyer_id',u,'rail','wallet','amount',a,'currency',c))
 returning id into j;

 update public.wallet_accounts set available_balance=available_balance-a,updated_at=now()
 where id=b.id and status='active' and available_balance>=a;
 if not found then raise exception 'INSUFFICIENT_FUNDS'; end if;

 update public.wallet_accounts set available_balance=available_balance+a,updated_at=now()
 where id=w.id and status='active';
 if not found then raise exception 'PLATFORM_WALLET_UPDATE_FAILED'; end if;

 insert into public.wallet_ledger(wallet_id,direction,amount,currency,entry_type,reference_type,reference_id,idempotency_key,metadata,journal_id)
 values
 (b.id,'debit',a,c,'order_payment','order',o.id,k,jsonb_build_object('order_id',o.id,'rail','wallet','engine_version','3.2.0'),j),
 (w.id,'credit',a,c,'order_receipt','order',o.id,k||':platform',jsonb_build_object('order_id',o.id,'buyer_id',u,'rail','wallet','source_idempotency_key',k,'engine_version','3.2.0'),j);

 perform private.validate_wallet_journal_balance(j);

 if po.id is not null then
   update public.payment_orchestrations set status='succeeded',provider='wallet',provider_reference=k,updated_at=now() where id=po.id;
 end if;

 update public.orders set status='paid',payment_status='paid',paid_at=now(),updated_at=now()
 where id=o.id and status='pending' and payment_status='pending';
 if not found then raise exception 'ORDER_UPDATE_FAILED'; end if;

 insert into public.order_status_history(order_id,from_status,to_status,changed_by,reason,metadata)
 values(o.id,'pending','paid',u,'wallet_payment',jsonb_build_object('rail','wallet','idempotency_key',k,'journal_id',j,'engine_version','3.2.0'));

 insert into public.commerce_events(user_id,event_type,amount,currency,metadata)
 values(u,'order_paid',a,c,jsonb_build_object('provider','wallet','order_id',o.id,'idempotency_key',k,'journal_id',j,'engine_version','3.2.0'));

 return jsonb_build_object('status','succeeded','amount',a,'currency',c,'journal_id',j);
end;
$function$;

revoke all on function private.wallet_pay_order(uuid,text) from public,anon,authenticated;

create or replace function public.wallet_pay_order(p_order_id uuid,p_idempotency_key text)
returns jsonb language sql security invoker set search_path=''
as $function$ select private.wallet_pay_order($1,$2); $function$;

revoke all on function public.wallet_pay_order(uuid,text) from public,anon;
grant execute on function public.wallet_pay_order(uuid,text) to authenticated;
