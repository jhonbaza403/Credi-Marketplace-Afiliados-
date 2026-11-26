-- Create the private access-context implementation before its public RPC wrapper.
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

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

create or replace function public.get_b2b_access_context(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select private.get_b2b_access_context($1);
$function$;

revoke all on function public.get_b2b_access_context(uuid) from public, anon;
grant execute on function public.get_b2b_access_context(uuid) to authenticated, service_role;
