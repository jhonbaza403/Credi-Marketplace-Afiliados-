-- Restore the production private helper functions missing from isolated Preview.

-- Definitions were read from the current Production catalog and are applied only to isolated Preview.

CREATE SCHEMA IF NOT EXISTS private;

GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.accept_negotiation(p_negotiation_id uuid, p_offer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 n public.negotiations;
 o public.negotiation_offers;
 u uuid := (select auth.uid());
 rl record;
 v_other_party uuid;
begin
 if u is null then raise exception 'UNAUTHORIZED'; end if;
 if p_negotiation_id is null or p_offer_id is null then raise exception 'INVALID_ARGUMENT'; end if;

 select * into rl from public.consume_api_rate_limit('negotiation_accept:'||u::text,30,60);
 if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;

 select * into n
 from public.negotiations
 where id=p_negotiation_id
 for update;

 if not found then raise exception 'NEGOTIATION_NOT_FOUND'; end if;
 if n.buyer_id=u then v_other_party:=n.seller_id;
 elsif n.seller_id=u then v_other_party:=n.buyer_id;
 else raise exception 'FORBIDDEN'; end if;

 if n.buyer_id=n.seller_id then raise exception 'INVALID_NEGOTIATION_PARTIES'; end if;
 if n.state<>'open' then raise exception 'INVALID_NEGOTIATION_STATE'; end if;
 if n.rounds < 0 or n.rounds >= 2147483647 then raise exception 'NEGOTIATION_ROUND_LIMIT'; end if;

 select * into o
 from public.negotiation_offers
 where id=p_offer_id and negotiation_id=p_negotiation_id
 for update;

 if not found then raise exception 'OFFER_NOT_FOUND'; end if;
 if o.status<>'proposed' then raise exception 'INVALID_OFFER_STATE'; end if;
 if o.actor_id=u or o.actor_id<>v_other_party then raise exception 'INVALID_OFFER_ACTOR'; end if;
 if (o.actor_id=n.buyer_id and o.actor_role<>'buyer')
    or (o.actor_id=n.seller_id and o.actor_role<>'seller') then
   raise exception 'INVALID_OFFER_ROLE';
 end if;
 if o.amount is null or o.amount<=0 then raise exception 'INVALID_OFFER_AMOUNT'; end if;
 if upper(trim(o.currency::text))<>upper(trim(n.currency::text)) then raise exception 'CURRENCY_MISMATCH'; end if;
 if n.buyer_max_price is not null and o.amount>n.buyer_max_price then raise exception 'BUYER_MAX_PRICE_EXCEEDED'; end if;
 if n.seller_min_price is not null and o.amount<n.seller_min_price then raise exception 'SELLER_MIN_PRICE_NOT_MET'; end if;

 update public.negotiations
 set state='accepted',
     current_price=o.amount,
     rounds=rounds+1,
     updated_at=now()
 where id=n.id and state='open';

 if not found then raise exception 'NEGOTIATION_STATE_CHANGED'; end if;

 update public.negotiation_offers
 set status='accepted'
 where id=o.id and status='proposed';

 if not found then raise exception 'OFFER_STATE_CHANGED'; end if;

 update public.negotiation_offers
 set status='rejected'
 where negotiation_id=n.id and id<>o.id and status='proposed';

 return jsonb_build_object(
   'status','accepted',
   'negotiation_id',n.id,
   'offer_id',o.id,
   'amount',o.amount,
   'currency',o.currency,
   'round',n.rounds+1
 );
end;
$function$;

REVOKE ALL ON FUNCTION private.accept_negotiation(uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.accept_negotiation(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION private.create_b2b_award(p_rfq_id uuid, p_quote_id uuid, p_buyer_id uuid, p_negotiation_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(award_id uuid, rfq_id uuid, quote_id uuid, buyer_id uuid, supplier_id uuid, status text, negotiation_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.business_rfqs;
  q public.business_rfq_quotes;
  n public.negotiations;
  a public.b2b_awards;
  s public.stores;
  u uuid := (select auth.uid());
  rl record;
begin
  if u is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if p_rfq_id is null or p_quote_id is null or p_buyer_id is null then
    raise exception 'INVALID_ARGUMENT';
  end if;

  if u <> p_buyer_id then
    raise exception 'FORBIDDEN';
  end if;

  select * into rl
  from public.consume_api_rate_limit('b2b_award:' || u::text, 15, 60);

  if not rl.allowed then
    raise exception 'RATE_LIMITED' using errcode='42900';
  end if;

  select * into r
  from public.business_rfqs
  where id = p_rfq_id
  for update;

  if not found then
    raise exception 'RFQ_NOT_FOUND';
  end if;

  if r.buyer_id <> u then
    raise exception 'RFQ_FORBIDDEN';
  end if;

  if r.status not in ('open','quoted','awarded') then
    raise exception 'RFQ_NOT_AWARDABLE';
  end if;

  if r.quantity <= 0 then
    raise exception 'RFQ_INVALID_QUANTITY';
  end if;

  select * into q
  from public.business_rfq_quotes
  where id = p_quote_id
    and rfq_id = p_rfq_id
  for update;

  if not found then
    raise exception 'QUOTE_NOT_FOUND';
  end if;

  if q.supplier_id = u then
    raise exception 'INVALID_COUNTERPARTY';
  end if;

  if q.status not in ('submitted','shortlisted','accepted') then
    raise exception 'QUOTE_NOT_AWARDABLE';
  end if;

  if q.unit_price < 0 then
    raise exception 'INVALID_QUOTE_PRICE';
  end if;

  if upper(trim(q.currency::text)) <> upper(trim(r.currency::text)) then
    raise exception 'CURRENCY_MISMATCH';
  end if;

  if q.min_order_quantity is not null
     and q.min_order_quantity > r.quantity then
    raise exception 'MIN_ORDER_QUANTITY_NOT_MET';
  end if;

  if q.available_quantity is not null
     and q.available_quantity < r.quantity then
    raise exception 'INSUFFICIENT_QUOTE_QUANTITY';
  end if;

  if q.store_id is not null then
    select * into s
    from public.stores
    where id = q.store_id
    for update;

    if not found then
      raise exception 'STORE_NOT_FOUND';
    end if;

    if not s.is_active then
      raise exception 'STORE_INACTIVE';
    end if;

    if s.vendor_id <> q.supplier_id then
      raise exception 'STORE_SUPPLIER_MISMATCH';
    end if;
  end if;

  if p_negotiation_id is not null then
    select * into n
    from public.negotiations
    where id = p_negotiation_id
    for update;

    if not found then
      raise exception 'NEGOTIATION_NOT_FOUND';
    end if;

    if n.rfq_id is distinct from p_rfq_id
       or n.buyer_id <> u
       or n.seller_id <> q.supplier_id
       or n.state <> 'accepted' then
      raise exception 'NEGOTIATION_MISMATCH';
    end if;

    if upper(trim(n.currency::text)) <> upper(trim(r.currency::text)) then
      raise exception 'NEGOTIATION_CURRENCY_MISMATCH';
    end if;

    if n.current_price <= 0 then
      raise exception 'INVALID_NEGOTIATION_PRICE';
    end if;

    if n.current_price <> q.unit_price then
      raise exception 'NEGOTIATION_QUOTE_PRICE_MISMATCH';
    end if;
  end if;

  select * into a
  from public.b2b_awards
  where rfq_id = p_rfq_id
    and quote_id = p_quote_id
  limit 1
  for update;

  if found then
    if a.buyer_id <> u
       or a.supplier_id <> q.supplier_id
       or a.store_id is distinct from q.store_id
       or a.negotiation_id is distinct from p_negotiation_id then
      raise exception 'AWARD_IDEMPOTENCY_CONFLICT';
    end if;

    if a.status not in ('awarded','negotiating','order_ready','ordered') then
      raise exception 'AWARD_NOT_ACTIVE';
    end if;

    return query
    select a.id,a.rfq_id,a.quote_id,a.buyer_id,a.supplier_id,a.status,a.negotiation_id;
    return;
  end if;

  if exists (
    select 1
    from public.b2b_awards x
    where x.rfq_id = p_rfq_id
      and x.status in ('awarded','negotiating','order_ready','ordered')
  ) then
    raise exception 'RFQ_ALREADY_AWARDED';
  end if;

  update public.business_rfq_quotes
  set status='accepted',
      updated_at=now()
  where id=q.id
    and status in ('submitted','shortlisted','accepted');

  if not found then
    raise exception 'QUOTE_STATE_CHANGED';
  end if;

  update public.business_rfq_quotes
  set status='rejected',
      updated_at=now()
  where rfq_id=r.id
    and id<>q.id
    and status in ('submitted','shortlisted','accepted');

  insert into public.b2b_awards(
    rfq_id,quote_id,buyer_id,supplier_id,store_id,status,negotiation_id
  )
  values(
    r.id,q.id,u,q.supplier_id,q.store_id,'awarded',p_negotiation_id
  )
  returning * into a;

  update public.business_rfqs
  set status='awarded',
      updated_at=now()
  where id=r.id
    and status in ('open','quoted','awarded');

  if not found then
    raise exception 'RFQ_STATE_CHANGED';
  end if;

  return query
  select a.id,a.rfq_id,a.quote_id,a.buyer_id,a.supplier_id,a.status,a.negotiation_id;
end;
$function$;

REVOKE ALL ON FUNCTION private.create_b2b_award(uuid,uuid,uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.create_b2b_award(uuid,uuid,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION private.credichat_is_member(p_conversation_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    (select auth.uid()) is not null
    and p_conversation_id is not null
    and p_user_id is not null
    and p_user_id=(select auth.uid())
    and exists(
      select 1 from public.conversation_members cm
      where cm.conversation_id=p_conversation_id
        and cm.user_id=p_user_id
    );
$function$;

REVOKE ALL ON FUNCTION private.credichat_is_member(uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.credichat_is_member(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.credichat_member_profile_ids(p_conversation_ids uuid[])
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select distinct cm.user_id
  from public.conversation_members cm
  where (select auth.uid()) is not null
    and coalesce(array_length(p_conversation_ids,1),0) between 1 and 100
    and cm.conversation_id = any(p_conversation_ids)
    and exists(
      select 1 from public.conversation_members me
      where me.conversation_id=cm.conversation_id
        and me.user_id=(select auth.uid())
    );
$function$;

REVOKE ALL ON FUNCTION private.credichat_member_profile_ids(uuid[]) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.credichat_member_profile_ids(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION private.get_b2b_access_context(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_email_confirmed boolean := false;
  v_active boolean := false;
  v_role text := 'customer';
  v_kyc text := 'not_started';
  v_kyb text := 'not_started';
  v_store_verified boolean := false;
  v_blocked_risk boolean := false;
  v_plan text := 'free';
  v_next text := 'confirm_email';
  v_allowed boolean := false;
  v_can_sell boolean := false;
  rl record;
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED' using errcode='42501';
  end if;
  if p_user_id is null or p_user_id <> v_user_id then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select * into rl
  from public.consume_api_rate_limit('b2b_access_context:' || v_user_id::text, 30, 60);
  if not rl.allowed then
    raise exception 'RATE_LIMITED' using errcode='42900';
  end if;

  select
    coalesce(u.email_confirmed_at is not null,false),
    coalesce(pr.is_active,false),
    coalesce(pr.role::text,'customer')
  into v_email_confirmed,v_active,v_role
  from auth.users u
  left join public.profiles pr on pr.id=u.id
  where u.id=v_user_id;

  if not found then
    raise exception 'USER_NOT_FOUND' using errcode='42501';
  end if;

  select coalesce(k.status,'not_started')
  into v_kyc
  from public.kyc_cases k
  where k.user_id=v_user_id
  order by k.updated_at desc nulls last, k.id desc
  limit 1;

  select coalesce(k.status,'not_started')
  into v_kyb
  from public.kyb_cases k
  where k.user_id=v_user_id
  order by k.updated_at desc nulls last, k.id desc
  limit 1;

  select exists(
    select 1
    from public.stores s
    where s.vendor_id=v_user_id
      and s.is_active
      and s.is_verified
  ) into v_store_verified;

  select exists(
    select 1
    from public.compliance_checks c
    where (
      (c.subject_type='kyc' and exists(
        select 1 from public.kyc_cases k
        where k.id=c.subject_id and k.user_id=v_user_id
      ))
      or
      (c.subject_type='kyb' and exists(
        select 1 from public.kyb_cases k
        where k.id=c.subject_id and k.user_id=v_user_id
      ))
    )
    and c.check_type in ('risk','aml','pep','sanctions')
    and c.status in ('failed','needs_review')
  ) into v_blocked_risk;

  select coalesce((
    select p.code
    from public.subscriptions s
    join public.plans p on p.id=s.plan_id
    where s.user_id=v_user_id
      and s.status in ('trialing','active')
    order by s.current_period_end desc nulls last, s.id desc
    limit 1
  ),'free') into v_plan;

  v_allowed := v_active and v_email_confirmed and not v_blocked_risk;

  v_can_sell :=
    v_active
    and v_email_confirmed
    and v_kyc='approved'
    and v_kyb='approved'
    and v_store_verified
    and not v_blocked_risk
    and v_role in ('vendor','company','professional','admin');

  if v_blocked_risk then
    v_next := 'manual_review';
  elsif not v_email_confirmed then
    v_next := 'confirm_email';
  elsif v_role in ('vendor','company','professional','admin') and v_kyc<>'approved' then
    v_next := 'complete_identity';
  elsif v_role in ('vendor','company','professional','admin') and (v_kyb<>'approved' or not v_store_verified) then
    v_next := 'verify_business';
  else
    v_next := 'ready';
  end if;

  return jsonb_build_object(
    'allowed',v_allowed,
    'can_sell',v_can_sell,
    'active',v_active,
    'email_confirmed',v_email_confirmed,
    'kyc_status',v_kyc,
    'kyb_status',v_kyb,
    'store_verified',v_store_verified,
    'risk_blocked',v_blocked_risk,
    'role',v_role,
    'plan_code',v_plan,
    'next_action',v_next
  );
end;
$function$;

REVOKE ALL ON FUNCTION private.get_b2b_access_context(uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.get_b2b_access_context(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.get_credi_contact(p_identifier text)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, role text, is_active boolean, store_name text, is_verified boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  u uuid := (select auth.uid());
  n text;
  rl record;
begin
  if u is null then
    raise exception 'UNAUTHORIZED' using errcode='42501';
  end if;

  if p_identifier is null then
    return;
  end if;

  n := trim(p_identifier);
  if length(n)=0 or length(n)>120 then
    return;
  end if;

  select * into rl
  from public.consume_api_rate_limit('contact_lookup:' || u::text,10,60);
  if not rl.allowed then
    raise exception 'RATE_LIMITED' using errcode='42900';
  end if;

  if upper(n) like 'CRD-%' then
    return query
    select
      p.id,
      p.full_name,
      p.avatar_url,
      p.role::text,
      p.is_active,
      s.store_name,
      coalesce(s.is_verified,false)
    from public.profiles p
    left join lateral (
      select st.store_name, st.is_verified
      from public.stores st
      where st.vendor_id=p.id
        and st.is_active=true
        and st.is_verified=true
      order by st.updated_at desc nulls last, st.id desc
      limit 1
    ) s on true
    where upper(trim(p.credi_pin))=upper(n)
      and p.is_active=true
      and p.id<>u
    limit 1;
    return;
  end if;

  n := public.normalize_credi_phone(n);
  if n is null or length(n)<8 or length(n)>20 then
    return;
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.role::text,
    p.is_active,
    s.store_name,
    coalesce(s.is_verified,false)
  from public.profiles p
  left join lateral (
    select st.store_name, st.is_verified
    from public.stores st
    where st.vendor_id=p.id
      and st.is_active=true
      and st.is_verified=true
    order by st.updated_at desc nulls last, st.id desc
    limit 1
  ) s on true
  where p.phone_e164=n
    and p.is_active=true
    and p.id<>u
  limit 1;
end;
$function$;

REVOKE ALL ON FUNCTION private.get_credi_contact(text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.get_credi_contact(text) TO service_role;

CREATE OR REPLACE FUNCTION private.get_credi_contact_by_pin(p_credi_pin text)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, role text, is_active boolean, store_name text, is_verified boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  u uuid := (select auth.uid());
  n text;
  rl record;
begin
  if u is null then
    raise exception 'UNAUTHORIZED' using errcode='42501';
  end if;

  if p_credi_pin is null then
    return;
  end if;

  n := upper(trim(p_credi_pin));
  if length(n)<4 or length(n)>64 then
    return;
  end if;

  if n !~ '^CRD-[A-Z0-9-]{1,60}$' then
    return;
  end if;

  select * into rl
  from public.consume_api_rate_limit('contact_pin_lookup:' || u::text,8,60);
  if not rl.allowed then
    raise exception 'RATE_LIMITED' using errcode='42900';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.role::text,
    p.is_active,
    s.store_name,
    coalesce(s.is_verified,false)
  from public.profiles p
  left join lateral (
    select st.store_name, st.is_verified
    from public.stores st
    where st.vendor_id=p.id
      and st.is_active=true
      and st.is_verified=true
    order by st.updated_at desc nulls last, st.id desc
    limit 1
  ) s on true
  where upper(trim(p.credi_pin))=n
    and p.is_active=true
    and p.id<>u
  limit 1;
end;
$function$;

REVOKE ALL ON FUNCTION private.get_credi_contact_by_pin(text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.get_credi_contact_by_pin(text) TO service_role;

CREATE OR REPLACE FUNCTION private.get_transaction_rating_targets(p_order_id uuid)
 RETURNS TABLE(store_id uuid, product_id uuid, store_name text, counterpart_id uuid, counterpart_role text, counterpart_name text, can_rate boolean, already_rated boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := (select auth.uid());
  rl record;
begin
  if v_user is null then
    raise exception 'UNAUTHORIZED' using errcode='42501';
  end if;
  if p_order_id is null then
    raise exception 'INVALID_ORDER' using errcode='22023';
  end if;

  select * into rl
  from public.consume_api_rate_limit('rating_targets:' || v_user::text, 60, 60);
  if not rl.allowed then
    raise exception 'RATE_LIMITED' using errcode='42900';
  end if;

  return query
  with order_rows as (
    select
      o.id as order_id,
      o.buyer_id,
      oi.store_id,
      oi.product_id,
      s.store_name,
      s.vendor_id
    from public.orders o
    join public.order_items oi on oi.order_id=o.id
    join public.stores s on s.id=oi.store_id
    where o.id=p_order_id
      and o.status='delivered'
      and (o.buyer_id=v_user or s.vendor_id=v_user)
  ),
  buyer_targets as (
    select distinct on (r.store_id)
      r.store_id,
      r.product_id,
      r.store_name,
      r.vendor_id as counterpart_id,
      'seller'::text as counterpart_role,
      coalesce(nullif(trim(p.full_name),''), r.store_name) as counterpart_name,
      (r.vendor_id is not null and r.vendor_id<>v_user) as can_rate,
      exists (
        select 1
        from public.transaction_ratings tr
        where tr.order_id=r.order_id
          and tr.store_id=r.store_id
          and tr.reviewer_id=v_user
          and tr.reviewee_id=r.vendor_id
      ) as already_rated
    from order_rows r
    left join public.profiles p on p.id=r.vendor_id
    where r.buyer_id=v_user
      and r.vendor_id is not null
      and r.vendor_id<>v_user
    order by r.store_id, r.product_id nulls last
  ),
  seller_targets as (
    select distinct on (r.store_id)
      r.store_id,
      r.product_id,
      r.store_name,
      r.buyer_id as counterpart_id,
      'buyer'::text as counterpart_role,
      coalesce(nullif(trim(p.full_name),''),'Cliente Credi') as counterpart_name,
      (r.buyer_id is not null and r.buyer_id<>v_user) as can_rate,
      exists (
        select 1
        from public.transaction_ratings tr
        where tr.order_id=r.order_id
          and tr.store_id=r.store_id
          and tr.reviewer_id=v_user
          and tr.reviewee_id=r.buyer_id
      ) as already_rated
    from order_rows r
    join public.profiles p on p.id=r.buyer_id
    where r.vendor_id=v_user
      and r.buyer_id<>v_user
    order by r.store_id, r.product_id nulls last
  )
  select * from buyer_targets
  union all
  select * from seller_targets;
end;
$function$;

REVOKE ALL ON FUNCTION private.get_transaction_rating_targets(uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.get_transaction_rating_targets(uuid) TO service_role;

CREATE OR REPLACE FUNCTION private.validate_settlement_binding_currency()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare wc char(3);
begin
 select currency into wc from public.wallet_accounts where id=new.wallet_account_id;
 if wc is null then raise exception 'WALLET_NOT_FOUND'; end if;
 if upper(trim(wc))<>upper(trim(new.currency)) then raise exception 'SETTLEMENT_BINDING_CURRENCY_MISMATCH'; end if;
 if new.beneficiary_role not in ('clearing','platform','government') then
   raise exception 'INVALID_INSTITUTIONAL_SETTLEMENT_ROLE';
 end if;
 return new;
end;$function$;

REVOKE ALL ON FUNCTION private.validate_settlement_binding_currency() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS validate_settlement_binding_currency ON public.settlement_account_bindings;

CREATE TRIGGER validate_settlement_binding_currency
BEFORE INSERT OR UPDATE ON public.settlement_account_bindings
FOR EACH ROW EXECUTE FUNCTION private.validate_settlement_binding_currency();
