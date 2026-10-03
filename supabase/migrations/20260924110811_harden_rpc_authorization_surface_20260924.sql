
create or replace function public.credichat_is_member(
  p_conversation_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and p_conversation_id is not null
    and coalesce(p_user_id, (select auth.uid())) = (select auth.uid())
    and exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = p_conversation_id
        and cm.user_id = (select auth.uid())
    );
$function$;

create or replace function public.credichat_mark_call_seen(p_call_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  if p_call_id is null then
    raise exception 'INVALID_CALL_ID' using errcode = '22023';
  end if;

  update public.chat_call_participants
  set last_seen_at = now()
  where call_id = p_call_id
    and user_id = (select auth.uid());

  if not found then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
end;
$function$;

create or replace function public.credichat_member_profile_ids(
  p_conversation_ids uuid[]
)
returns table(user_id uuid)
language sql
stable
security definer
set search_path = ''
as $function$
  select distinct cm.user_id
  from public.conversation_members cm
  where (select auth.uid()) is not null
    and p_conversation_ids is not null
    and coalesce(cardinality(p_conversation_ids), 0) between 1 and 100
    and cm.conversation_id = any(p_conversation_ids)
    and public.credichat_is_member(cm.conversation_id, (select auth.uid()));
$function$;

create or replace function public.credichat_record_call_status(
  p_call_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_current_status text;
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  if p_call_id is null then
    raise exception 'INVALID_CALL_ID' using errcode = '22023';
  end if;

  if p_status is null or p_status not in ('active','ended','declined','missed','failed') then
    raise exception 'INVALID_CALL_STATUS' using errcode = '22023';
  end if;

  if p_reason is not null and length(p_reason) > 500 then
    raise exception 'CALL_REASON_TOO_LONG' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.chat_call_participants ccp
    where ccp.call_id = p_call_id
      and ccp.user_id = v_user
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select cc.status
    into v_current_status
  from public.chat_calls cc
  where cc.id = p_call_id
  for update;

  if not found then
    raise exception 'CALL_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_current_status in ('ended','declined','missed','failed') and p_status <> v_current_status then
    raise exception 'CALL_ALREADY_TERMINAL' using errcode = '55000';
  end if;

  if v_current_status = 'active' and p_status in ('declined','missed') then
    raise exception 'INVALID_CALL_TRANSITION' using errcode = '22023';
  end if;

  update public.chat_calls
  set status = p_status,
      ended_reason = case
        when p_status in ('ended','declined','missed','failed')
          then coalesce(nullif(trim(p_reason), ''), ended_reason)
        else ended_reason
      end,
      updated_at = now(),
      started_at = case
        when p_status = 'active' and started_at is null then now()
        else started_at
      end,
      ended_at = case
        when p_status in ('ended','declined','missed','failed')
          then coalesce(ended_at, now())
        when p_status = 'active'
          then null
        else ended_at
      end
  where id = p_call_id;
end;
$function$;

create or replace function public.get_b2b_access_context(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
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
begin
  if v_user_id is null or p_user_id is null or p_user_id <> v_user_id then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select
    coalesce(u.email_confirmed_at is not null, false),
    coalesce(pr.is_active, false),
    coalesce(pr.role::text, 'customer')
  into v_email_confirmed, v_active, v_role
  from auth.users u
  left join public.profiles pr on pr.id = u.id
  where u.id = v_user_id;

  select coalesce(k.status, 'not_started')
  into v_kyc
  from public.kyc_cases k
  where k.user_id = v_user_id
  order by k.updated_at desc
  limit 1;

  select coalesce(k.status, 'not_started')
  into v_kyb
  from public.kyb_cases k
  where k.user_id = v_user_id
  order by k.updated_at desc
  limit 1;

  select exists (
    select 1
    from public.stores s
    where s.vendor_id = v_user_id
      and s.is_active = true
      and s.is_verified = true
  ) into v_store_verified;

  select exists (
    select 1
    from public.compliance_checks c
    where (
      (c.subject_type = 'kyc' and exists (
        select 1 from public.kyc_cases k
        where k.id = c.subject_id and k.user_id = v_user_id
      ))
      or
      (c.subject_type = 'kyb' and exists (
        select 1 from public.kyb_cases k
        where k.id = c.subject_id and k.user_id = v_user_id
      ))
    )
    and c.check_type in ('risk','aml','pep','sanctions')
    and c.status in ('failed','needs_review')
  ) into v_blocked_risk;

  select coalesce((
    select p.code
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.user_id = v_user_id
      and s.status in ('trialing','active')
    order by s.current_period_end desc nulls last
    limit 1
  ), 'free') into v_plan;

  v_allowed := v_active and v_email_confirmed and not v_blocked_risk;
  v_can_sell :=
    v_active
    and v_email_confirmed
    and v_kyc = 'approved'
    and v_kyb = 'approved'
    and v_store_verified
    and not v_blocked_risk
    and v_role in ('vendor','company','professional','admin');

  if v_blocked_risk then
    v_next := 'manual_review';
  elsif not v_email_confirmed then
    v_next := 'confirm_email';
  elsif v_kyc <> 'approved' and v_role in ('vendor','company','professional','admin') then
    v_next := 'complete_identity';
  elsif v_role in ('vendor','company','professional','admin')
        and (v_kyb <> 'approved' or not v_store_verified) then
    v_next := 'verify_business';
  else
    v_next := 'ready';
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'can_sell', v_can_sell,
    'active', v_active,
    'email_confirmed', v_email_confirmed,
    'kyc_status', v_kyc,
    'kyb_status', v_kyb,
    'store_verified', v_store_verified,
    'risk_blocked', v_blocked_risk,
    'role', v_role,
    'plan_code', v_plan,
    'next_action', v_next
  );
end;
$function$;

create or replace function public.get_transaction_rating_targets(p_order_id uuid)
returns table(
  store_id uuid,
  product_id uuid,
  store_name text,
  counterpart_id uuid,
  counterpart_role text,
  counterpart_name text,
  can_rate boolean,
  already_rated boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null or p_order_id is null then
    return;
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
    join public.order_items oi on oi.order_id = o.id
    join public.stores s on s.id = oi.store_id
    where o.id = p_order_id
      and o.status = 'delivered'
      and (o.buyer_id = v_user or s.vendor_id = v_user)
  ),
  buyer_targets as (
    select distinct on (r.store_id)
      r.store_id,
      r.product_id,
      r.store_name,
      r.vendor_id as counterpart_id,
      'seller'::text as counterpart_role,
      coalesce(p.full_name, r.store_name) as counterpart_name,
      true as can_rate,
      exists(
        select 1
        from public.transaction_ratings tr
        where tr.order_id = r.order_id
          and tr.store_id = r.store_id
          and tr.reviewer_id = v_user
      ) as already_rated
    from order_rows r
    left join public.profiles p on p.id = r.vendor_id
    where r.buyer_id = v_user
      and r.vendor_id <> v_user
    order by r.store_id, r.product_id
  ),
  seller_targets as (
    select distinct on (r.store_id)
      r.store_id,
      r.product_id,
      r.store_name,
      r.buyer_id as counterpart_id,
      'buyer'::text as counterpart_role,
      coalesce(p.full_name, 'Cliente Credi') as counterpart_name,
      true as can_rate,
      exists(
        select 1
        from public.transaction_ratings tr
        where tr.order_id = r.order_id
          and tr.store_id = r.store_id
          and tr.reviewer_id = v_user
      ) as already_rated
    from order_rows r
    join public.profiles p on p.id = r.buyer_id
    where r.vendor_id = v_user
      and r.buyer_id <> v_user
    order by r.store_id, r.product_id
  )
  select * from buyer_targets
  union all
  select * from seller_targets;
end;
$function$;

create or replace function public.initialize_order_tax_transaction(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
  v_seller uuid;
  v_tax_id uuid;
  v_jurisdiction uuid;
  v_snapshot jsonb;
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if p_order_id is null then
    raise exception 'INVALID_ORDER_ID' using errcode = '22023';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
    and buyer_id = v_user
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_order.status::text in ('cancelled','refunded') then
    raise exception 'ORDER_NOT_ELIGIBLE' using errcode = '55000';
  end if;

  select s.vendor_id
  into v_seller
  from public.order_items oi
  join public.stores s on s.id = oi.store_id
  where oi.order_id = p_order_id
  order by oi.created_at asc
  limit 1;

  if v_seller is null then
    raise exception 'ORDER_SELLER_NOT_FOUND' using errcode = 'P0002';
  end if;

  select id
  into v_jurisdiction
  from public.tax_jurisdictions
  where jurisdiction_code = 'NOT_CONFIGURED'
    and country_code = 'ZZ'
    and active = true
  limit 1;

  v_snapshot := jsonb_build_object(
    'engine_version','1.0.0',
    'calculation_status','not_configured',
    'merchant_model','marketplace_intermediary',
    'order_id',v_order.id,
    'buyer_id',v_order.buyer_id,
    'seller_id',v_seller,
    'region',v_order.region,
    'jurisdiction_code','NOT_CONFIGURED',
    'jurisdiction_country','ZZ',
    'tax_category_code','generic',
    'gross_amount',v_order.total_amount,
    'taxable_amount',0,
    'tax_amount',0,
    'currency',trim(v_order.currency::text),
    'snapshot_at',now(),
    'reason','No verified jurisdiction-specific tax rule is configured; no tax is asserted by the engine.'
  );

  insert into public.tax_transactions(
    order_id,buyer_id,seller_id,affiliate_id,jurisdiction_id,taxpayer_role,tax_period,currency,
    gross_amount,taxable_amount,tax_amount,status,snapshot,source_type,source_reference,
    merchant_model,rule_version,calculation_status
  ) values (
    v_order.id,v_order.buyer_id,v_seller,v_order.affiliate_id,v_jurisdiction,'seller',
    to_char(coalesce(v_order.created_at,now()),'YYYY-MM'),trim(v_order.currency::text),
    v_order.total_amount,0,0,'calculated',v_snapshot,'order',v_order.id::text,
    'marketplace_intermediary','1.0.0','not_configured'
  )
  on conflict (order_id,source_type) where order_id is not null
  do update set
    snapshot=excluded.snapshot,
    seller_id=excluded.seller_id,
    buyer_id=excluded.buyer_id,
    updated_at=now()
  returning id into v_tax_id;

  update public.orders
  set tax_engine_status='not_configured',
      tax_snapshot=v_snapshot,
      tax_amount=0,
      updated_at=now()
  where id=p_order_id
    and buyer_id=v_user;

  if not found then
    raise exception 'ORDER_UPDATE_FAILED' using errcode = '40001';
  end if;

  return v_tax_id;
end;
$function$;

-- Contact lookup is intentionally app-callable, but stays authenticated-only.
-- Bound input normalization prevents empty/unbounded lookup inputs; authorization is authentication-gated.
create or replace function public.get_credi_contact(p_identifier text)
returns table(id uuid, full_name text, avatar_url text, role text, is_active boolean, store_name text, is_verified boolean)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  normalized text;
begin
  if (select auth.uid()) is null then
    raise exception 'UNAUTHORIZED' using errcode='42501';
  end if;

  if p_identifier is null or length(trim(p_identifier)) > 120 then
    return;
  end if;

  normalized := upper(trim(p_identifier));
  if normalized = '' then
    return;
  end if;

  if normalized like 'CRD-%' then
    return query
      select p.id, p.full_name, p.avatar_url, p.role::text, p.is_active, s.store_name, s.is_verified
      from public.profiles p
      left join public.stores s on s.vendor_id = p.id and s.is_active = true
      where p.credi_pin = normalized and p.is_active = true
      limit 1;
  end if;

  normalized := public.normalize_credi_phone(p_identifier);
  if normalized is null then
    return;
  end if;

  return query
    select p.id, p.full_name, p.avatar_url, p.role::text, p.is_active, s.store_name, s.is_verified
    from public.profiles p
    left join public.stores s on s.vendor_id = p.id and s.is_active = true
    where p.phone_e164 = normalized and p.is_active = true
    limit 1;
end;
$function$;

create or replace function public.get_credi_contact_by_pin(p_credi_pin text)
returns table(id uuid, full_name text, avatar_url text, role text, is_active boolean, store_name text, is_verified boolean)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.role::text,
    p.is_active,
    s.store_name,
    s.is_verified
  from public.profiles p
  left join lateral (
    select st.store_name, st.is_verified
    from public.stores st
    where st.vendor_id = p.id and st.is_active = true
    order by st.is_verified desc, st.created_at asc
    limit 1
  ) s on true
  where (select auth.uid()) is not null
    and p_credi_pin is not null
    and length(trim(p_credi_pin)) between 4 and 64
    and p.credi_pin = upper(trim(p_credi_pin))
    and p.is_active = true
  limit 1;
$function$;
