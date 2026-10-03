create or replace function public.get_b2b_access_context(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_email_confirmed boolean := false;
  v_active boolean := false;
  v_role text := 'customer';
  v_kyc text := 'not_started';
  v_kyb text := 'not_started';
  v_store_verified boolean := false;
  v_blocked_risk boolean := false;
  v_plan text := 'free';
  v_next text := 'complete_identity';
  v_allowed boolean := false;
  v_can_sell boolean := false;
begin
  if v_user_id is null or p_user_id is null or p_user_id <> v_user_id then
    raise exception 'not_authorized';
  end if;

  select coalesce(u.email_confirmed_at is not null, false), coalesce(pr.is_active, false), coalesce(pr.role::text, 'customer')
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
      (c.subject_type = 'kyc' and exists (select 1 from public.kyc_cases k where k.id = c.subject_id and k.user_id = v_user_id))
      or
      (c.subject_type = 'kyb' and exists (select 1 from public.kyb_cases k where k.id = c.subject_id and k.user_id = v_user_id))
    )
    and c.check_type in ('risk','aml','pep','sanctions')
    and c.status in ('failed','needs_review')
  ) into v_blocked_risk;

  select coalesce((select p.code from public.subscriptions s join public.plans p on p.id = s.plan_id where s.user_id = v_user_id and s.status in ('trialing','active') order by s.current_period_end desc nulls last limit 1), 'free') into v_plan;

  v_allowed := v_active and v_email_confirmed and v_kyc = 'approved' and not v_blocked_risk;
  v_can_sell := v_allowed and v_kyb = 'approved' and v_store_verified and v_role in ('vendor','company','professional','admin');

  if v_blocked_risk then
    v_next := 'manual_review';
  elsif not v_email_confirmed then
    v_next := 'confirm_email';
  elsif v_kyc <> 'approved' then
    v_next := 'complete_identity';
  elsif v_role in ('vendor','company','professional') and (v_kyb <> 'approved' or not v_store_verified) then
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
$$;

revoke all on function public.get_b2b_access_context(uuid) from public, anon;
grant execute on function public.get_b2b_access_context(uuid) to authenticated;

insert into public.plan_features (plan_id, feature_key, enabled, quota, metadata)
select p.id, 'b2b.workspace', true, null, jsonb_build_object('requires_kyc', true, 'seller_requires_kyb', true)
from public.plans p
where p.is_active = true
  and not exists (select 1 from public.plan_features f where f.plan_id = p.id and f.feature_key = 'b2b.workspace');

create or replace function public.enforce_verified_b2b_store()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_kyc text;
  v_kyb text;
begin
  if new.is_verified = true then
    select k.status into v_kyc from public.kyc_cases k where k.user_id = new.vendor_id order by k.updated_at desc limit 1;
    select k.status into v_kyb from public.kyb_cases k where k.user_id = new.vendor_id order by k.updated_at desc limit 1;
    if v_kyc is distinct from 'approved' or v_kyb is distinct from 'approved' then
      raise exception 'seller_verification_required';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_verified_b2b_store on public.stores;
create trigger trg_verified_b2b_store
before insert or update of is_verified, vendor_id on public.stores
for each row execute function public.enforce_verified_b2b_store();

create or replace function public.enforce_verified_b2b_product()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_kyc text;
  v_kyb text;
  v_store_ok boolean;
begin
  if new.status = 'published' then
    select k.status into v_kyc from public.kyc_cases k where k.user_id = new.supplier_id order by k.updated_at desc limit 1;
    select k.status into v_kyb from public.kyb_cases k where k.user_id = new.supplier_id order by k.updated_at desc limit 1;
    select exists(select 1 from public.stores s where s.vendor_id = new.supplier_id and s.is_active = true and s.is_verified = true) into v_store_ok;
    if v_kyc is distinct from 'approved' or v_kyb is distinct from 'approved' or not v_store_ok then
      raise exception 'verified_seller_required';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_verified_b2b_product on public.b2b_products;
create trigger trg_verified_b2b_product
before insert or update of status, supplier_id on public.b2b_products
for each row execute function public.enforce_verified_b2b_product();

create or replace view public.verified_businesses as
select
  s.id,
  s.vendor_id,
  s.store_name,
  s.slug,
  s.description,
  s.logo_url,
  s.banner_url,
  s.is_verified,
  s.is_active
from public.stores s
join lateral (
  select k.status from public.kyc_cases k where k.user_id = s.vendor_id order by k.updated_at desc limit 1
) kyc on kyc.status = 'approved'
join lateral (
  select k.status from public.kyb_cases k where k.user_id = s.vendor_id order by k.updated_at desc limit 1
) kyb on kyb.status = 'approved'
where s.is_active = true and s.is_verified = true;

revoke all on public.verified_businesses from anon;
grant select on public.verified_businesses to authenticated;
