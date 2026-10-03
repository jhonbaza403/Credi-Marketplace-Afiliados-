
create or replace function private.wallet_refund_order(
  p_order_id uuid,
  p_amount numeric,
  p_reason text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := (select auth.uid());
  o public.orders;
  buyer public.wallet_accounts;
  platform public.wallet_accounts;
  orig public.wallet_journals;
  j uuid;
  refund_id uuid;
  a numeric;
  c text;
  used numeric := 0;
  remaining numeric;
  raw text;
  existing public.wallet_refunds;
  rl record;
  original_platform_credit numeric := 0;
begin
  if u is null then raise exception 'UNAUTHORIZED'; end if;
  select * into rl from public.consume_api_rate_limit('wallet_refund:'||u::text,10,60);
  if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;
  if p_order_id is null or p_amount is null or p_amount <= 0 then raise exception 'INVALID_REFUND_AMOUNT'; end if;

  raw := nullif(trim(p_idempotency_key),'');
  if raw is null or length(raw) < 16 or length(raw) > 200 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  if p_reason is null or length(trim(p_reason)) < 3 or length(trim(p_reason)) > 500 then raise exception 'INVALID_REFUND_REASON'; end if;

  select platform_owner into strict rl from public.profiles where id=u;
  if not coalesce(rl.platform_owner,false) then raise exception 'FORBIDDEN'; end if;

  perform pg_advisory_xact_lock(hashtextextended('wallet_refund:'||p_order_id::text,0));

  select * into existing from public.wallet_refunds where idempotency_key=raw limit 1;
  if found then
    if existing.order_id<>p_order_id or existing.amount<>round(p_amount,8) then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return jsonb_build_object('status','succeeded','refund_id',existing.id,'amount',existing.amount,'currency',existing.currency,'journal_id',existing.refund_journal_id);
  end if;

  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if o.payment_status not in ('paid','partially_refunded')
     and o.status not in ('paid','delivered','completed','partially_refunded') then
    raise exception 'ORDER_NOT_REFUNDABLE';
  end if;

  a:=round(p_amount,8);
  c:=upper(trim(o.currency));
  if c is null or c !~ '^[A-Z]{3}$' then raise exception 'INVALID_ORDER_CURRENCY'; end if;

  select * into orig
  from public.wallet_journals
  where reference_type='order' and reference_id=o.id and journal_type='payment' and status='posted'
  order by created_at desc limit 1 for update;
  if not found then raise exception 'ORIGINAL_PAYMENT_JOURNAL_NOT_FOUND'; end if;
  if orig.currency<>c then raise exception 'CURRENCY_MISMATCH'; end if;

  select coalesce(sum(amount),0) into original_platform_credit
  from public.wallet_ledger
  where journal_id=orig.id and direction='credit' and currency=c;
  if original_platform_credit <= 0 then raise exception 'ORIGINAL_PAYMENT_NOT_SETTLED'; end if;

  select coalesce(sum(amount),0) into used from public.wallet_refunds where order_id=o.id;
  remaining:=round(least(o.total_amount,original_platform_credit)-used,8);
  if remaining<=0 then raise exception 'ORDER_ALREADY_FULLY_REFUNDED'; end if;
  if a>remaining then raise exception 'REFUND_EXCEEDS_AVAILABLE'; end if;

  insert into public.wallet_accounts(user_id,currency) values(o.buyer_id,c) on conflict(user_id,currency) do nothing;
  select * into buyer from public.wallet_accounts where user_id=o.buyer_id and currency=c for update;

  select wa.* into platform
  from public.wallet_accounts wa
  join public.profiles p on p.id=wa.user_id
  where p.platform_owner=true and wa.currency=c and wa.status='active'
  order by wa.created_at limit 1 for update;
  if not found then raise exception 'PLATFORM_WALLET_NOT_CONFIGURED'; end if;
  if platform.id=buyer.id then raise exception 'INVALID_REFUND_WALLETS'; end if;
  if platform.available_balance<a then raise exception 'PLATFORM_INSUFFICIENT_FUNDS'; end if;

  insert into public.wallet_journals(currency,journal_type,reference_type,reference_id,parent_journal_id,idempotency_key,metadata)
  values(c,'refund','order',o.id,orig.id,'refund:'||raw,
    jsonb_build_object('order_id',o.id,'original_journal_id',orig.id,'amount',a,'reason',trim(p_reason),'created_by',u,'engine_version','4.0.0'))
  returning id into j;

  update public.wallet_accounts set available_balance=available_balance-a,updated_at=now() where id=platform.id;
  update public.wallet_accounts set available_balance=available_balance+a,updated_at=now() where id=buyer.id;

  insert into public.wallet_ledger(wallet_id,direction,amount,currency,entry_type,reference_type,reference_id,idempotency_key,metadata,journal_id)
  values(platform.id,'debit',a,c,'refund','order',o.id,'refund:'||raw||':debit',jsonb_build_object('order_id',o.id,'original_journal_id',orig.id,'reason',trim(p_reason)),j);
  insert into public.wallet_ledger(wallet_id,direction,amount,currency,entry_type,reference_type,reference_id,idempotency_key,metadata,journal_id)
  values(buyer.id,'credit',a,c,'refund','order',o.id,'refund:'||raw||':credit',jsonb_build_object('order_id',o.id,'original_journal_id',orig.id,'reason',trim(p_reason)),j);

  perform private.validate_wallet_journal_balance(j);

  insert into public.wallet_refunds(order_id,original_journal_id,refund_journal_id,amount,currency,idempotency_key,reason,created_by)
  values(o.id,orig.id,j,a,c,raw,trim(p_reason),u)
  returning id into refund_id;

  if a>=remaining then
    update public.orders set status='refunded',payment_status='refunded',refunded_at=coalesce(refunded_at,now()),updated_at=now() where id=o.id;
  else
    update public.orders
    set status=case when status in ('paid','delivered','completed') then 'partially_refunded' else status end,
        payment_status='partially_refunded',updated_at=now()
    where id=o.id;
  end if;

  return jsonb_build_object('status','succeeded','refund_id',refund_id,'amount',a,'currency',c,'journal_id',j);
end
$$;

revoke all on function private.wallet_refund_order(uuid,numeric,text,text) from public, anon, authenticated;
revoke all on function public.wallet_refund_order(uuid,numeric,text,text) from public, anon;
grant execute on function public.wallet_refund_order(uuid,numeric,text,text) to authenticated;
