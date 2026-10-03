
-- Enterprise wallet invariant: one account per user + currency.
-- Existing data has only one wallet, so this is safe and deterministic.
alter table public.wallet_accounts
  drop constraint if exists wallet_accounts_user_id_key;

alter table public.wallet_accounts
  add constraint wallet_accounts_user_currency_key unique (user_id, currency);

alter table public.wallet_accounts
  add constraint wallet_accounts_currency_format
  check (currency ~ '^[A-Z]{3}$');

create or replace function public.ensure_my_wallet(p_currency text default 'USD')
returns public.wallet_accounts
language plpgsql
security invoker
set search_path=''
as $function$
declare
  v public.wallet_accounts;
  c text := upper(trim(coalesce(p_currency,'USD')));
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  if c !~ '^[A-Z]{3}$' then raise exception 'INVALID_CURRENCY'; end if;

  insert into public.wallet_accounts(user_id,currency)
  values(auth.uid(),c)
  on conflict (user_id,currency) do nothing;

  select * into v
  from public.wallet_accounts
  where user_id=auth.uid() and currency=c;

  return v;
end
$function$;

revoke all on function public.ensure_my_wallet(text) from public, anon;
grant execute on function public.ensure_my_wallet(text) to authenticated;

create or replace function public.wallet_transfer(
  p_to_user_id uuid,
  p_amount numeric,
  p_currency text default 'USD',
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  f public.wallet_accounts;
  t public.wallet_accounts;
  u uuid := (select auth.uid());
  c text;
  a numeric;
  raw text;
  k text;
  em jsonb;
  old jsonb;
  rl record;
begin
  if u is null then raise exception 'UNAUTHORIZED'; end if;

  select * into rl from public.consume_api_rate_limit(
    'wallet_transfer:'||u::text,20,60
  );
  if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;

  c := upper(trim(coalesce(p_currency,'USD')));
  if c !~ '^[A-Z]{3}$' then raise exception 'INVALID_CURRENCY'; end if;
  if p_to_user_id is null or p_to_user_id=u then raise exception 'INVALID_RECIPIENT'; end if;

  a := round(p_amount,8);
  if a<=0 or a>1000000000000 then raise exception 'INVALID_AMOUNT'; end if;

  raw := nullif(trim(p_idempotency_key),'');
  if raw is null or length(raw)<16 or length(raw)>200 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;

  k := 'transfer:'||u::text||':'||raw;
  perform pg_advisory_xact_lock(hashtextextended(k,0));

  select metadata into em
  from public.wallet_ledger
  where idempotency_key=k
  limit 1;

  if em is not null then
    if coalesce(em->>'to_user_id','')<>p_to_user_id::text then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    select jsonb_build_object('status','succeeded','amount',amount,'currency',currency)
      into old
    from public.wallet_ledger
    where idempotency_key=k
    limit 1;
    if old->>'amount'<>a::text or old->>'currency'<>c then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return old;
  end if;

  insert into public.wallet_accounts(user_id,currency)
  values(u,c)
  on conflict (user_id,currency) do nothing;

  insert into public.wallet_accounts(user_id,currency)
  values(p_to_user_id,c)
  on conflict (user_id,currency) do nothing;

  if u::text<p_to_user_id::text then
    select * into f from public.wallet_accounts
      where user_id=u and currency=c for update;
    select * into t from public.wallet_accounts
      where user_id=p_to_user_id and currency=c for update;
  else
    select * into t from public.wallet_accounts
      where user_id=p_to_user_id and currency=c for update;
    select * into f from public.wallet_accounts
      where user_id=u and currency=c for update;
  end if;

  if f.currency<>c or t.currency<>c or f.status<>'active' or t.status<>'active' then
    raise exception 'WALLET_NOT_ACTIVE';
  end if;
  if f.available_balance<a then raise exception 'INSUFFICIENT_FUNDS'; end if;

  update public.wallet_accounts
    set available_balance=available_balance-a,updated_at=now()
    where id=f.id;
  update public.wallet_accounts
    set available_balance=available_balance+a,updated_at=now()
    where id=t.id;

  insert into public.wallet_ledger(
    wallet_id,direction,amount,currency,entry_type,reference_type,
    reference_id,idempotency_key,metadata
  ) values (
    f.id,'debit',a,c,'transfer','user',p_to_user_id,k,
    jsonb_build_object('to_user_id',p_to_user_id)
  );

  insert into public.wallet_ledger(
    wallet_id,direction,amount,currency,entry_type,reference_type,
    reference_id,idempotency_key,metadata
  ) values (
    t.id,'credit',a,c,'transfer','user',u,k||':credit',
    jsonb_build_object('from_user_id',u,'source_idempotency_key',k)
  );

  return jsonb_build_object('status','succeeded','amount',a,'currency',c);
exception
  when unique_violation then
    if sqlerrm like '%wallet_ledger_idempotency_key_key%' then
      select jsonb_build_object('status','succeeded','amount',amount,'currency',currency)
        into old from public.wallet_ledger where idempotency_key=k limit 1;
      if old is not null then return old; end if;
    end if;
    raise;
end
$function$;

revoke all on function public.wallet_transfer(uuid,numeric,text,text) from public, anon;
grant execute on function public.wallet_transfer(uuid,numeric,text,text) to authenticated;

create or replace function public.wallet_pay_order(
  p_order_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  u uuid := (select auth.uid());
  o public.orders;
  b public.wallet_accounts;
  w public.wallet_accounts;
  k text;
  a numeric;
  c text;
  rl record;
  ea numeric;
  ec text;
begin
  if u is null then raise exception 'UNAUTHORIZED'; end if;

  select * into rl from public.consume_api_rate_limit(
    'wallet_pay_order:'||u::text,10,60
  );
  if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;

  if p_order_id is null or p_idempotency_key is null
     or length(trim(p_idempotency_key))<16
     or length(trim(p_idempotency_key))>200 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;

  k := 'wallet_order:'||u::text||':'||p_order_id::text||':'||trim(p_idempotency_key);
  perform pg_advisory_xact_lock(hashtextextended(k,0));

  select * into o from public.orders
  where id=p_order_id and buyer_id=u
  for update;

  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.status<>'pending' or o.payment_status<>'pending' then
    raise exception 'ORDER_NOT_PAYABLE';
  end if;

  a := round(o.total_amount,8);
  c := upper(trim(coalesce(o.currency,'USD')));
  if a<=0 then raise exception 'INVALID_ORDER_TOTAL'; end if;

  select amount,currency into ea,ec
  from public.wallet_ledger where idempotency_key=k limit 1;

  if ea is not null then
    if ea<>a or ec<>c then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return jsonb_build_object('status','succeeded','amount',ea,'currency',ec);
  end if;

  insert into public.wallet_accounts(user_id,currency)
  values(u,c)
  on conflict (user_id,currency) do nothing;

  select * into b
  from public.wallet_accounts
  where user_id=u and currency=c
  for update;

  if b.currency<>c or b.status<>'active' then raise exception 'WALLET_NOT_ACTIVE'; end if;
  if b.available_balance<a then raise exception 'INSUFFICIENT_FUNDS'; end if;

  select wa.* into w
  from public.wallet_accounts wa
  join public.profiles p on p.id=wa.user_id
  where p.platform_owner=true and wa.currency=c and wa.status='active'
  order by wa.created_at
  limit 1
  for update;

  if not found or w.id=b.id then raise exception 'PLATFORM_WALLET_NOT_CONFIGURED'; end if;

  update public.wallet_accounts
    set available_balance=available_balance-a,updated_at=now()
    where id=b.id;
  update public.wallet_accounts
    set available_balance=available_balance+a,updated_at=now()
    where id=w.id;

  insert into public.wallet_ledger(
    wallet_id,direction,amount,currency,entry_type,reference_type,
    reference_id,idempotency_key,metadata
  ) values (
    b.id,'debit',a,c,'order_payment','order',o.id,k,
    jsonb_build_object('order_id',o.id,'rail','wallet')
  );

  insert into public.wallet_ledger(
    wallet_id,direction,amount,currency,entry_type,reference_type,
    reference_id,idempotency_key,metadata
  ) values (
    w.id,'credit',a,c,'order_receipt','order',o.id,k||':platform',
    jsonb_build_object('order_id',o.id,'buyer_id',u,'rail','wallet','source_idempotency_key',k)
  );

  update public.payment_orchestrations
  set status='succeeded',provider='wallet',provider_reference=k,updated_at=now()
  where order_id=o.id and user_id=u and method_type='wallet'
    and idempotency_key is not distinct from p_idempotency_key;

  update public.orders
  set status='paid',payment_status='paid',paid_at=now(),updated_at=now()
  where id=o.id and status='pending' and payment_status='pending';

  if not found then raise exception 'ORDER_UPDATE_FAILED'; end if;

  insert into public.order_status_history(
    order_id,from_status,to_status,changed_by,reason,metadata
  ) values (
    o.id,'pending','paid',u,'wallet_payment',
    jsonb_build_object('rail','wallet','idempotency_key',k)
  );

  insert into public.commerce_events(
    user_id,event_type,amount,currency,metadata
  ) values (
    u,'order_paid',a,c,
    jsonb_build_object('provider','wallet','order_id',o.id,'idempotency_key',k)
  );

  return jsonb_build_object('status','succeeded','amount',a,'currency',c);
end
$function$;

revoke all on function public.wallet_pay_order(uuid,text) from public, anon;
grant execute on function public.wallet_pay_order(uuid,text) to authenticated;
