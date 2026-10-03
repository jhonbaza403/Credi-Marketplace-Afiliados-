CREATE OR REPLACE FUNCTION public.current_user_plan(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(plan_id uuid, plan_code text, plan_name text, status text, billing_interval text, limits jsonb)
LANGUAGE sql
STABLE
SET search_path='public'
AS $$
with effective as (
  select p.id, p.code, p.name, s.status, s.billing_interval, p.limits, s.created_at
  from public.subscriptions s
  join public.plans p on p.id=s.plan_id
  where s.user_id=p_user_id
    and s.status in ('trialing','active')
    and (s.status='trialing' or s.cancel_at_period_end=false or s.current_period_end is null or s.current_period_end>now())
  order by s.created_at desc
  limit 1
)
select id, code, name, status, billing_interval, limits from effective
union all
select p.id, p.code, p.name, 'active'::text, 'free'::text, p.limits
from public.plans p
where p.code='free' and p.is_active=true
  and not exists(select 1 from effective)
limit 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_entitlement(p_feature_key text, p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(enabled boolean, quota bigint, plan_code text)
LANGUAGE sql
STABLE
SET search_path='public'
AS $$
select pf.enabled, pf.quota, c.plan_code
from public.current_user_plan(p_user_id) c
join public.plan_features pf on pf.plan_id=c.plan_id
where pf.feature_key=p_feature_key
limit 1;
$$;

CREATE OR REPLACE FUNCTION public.user_has_plan_feature(p_feature_key text, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path='public'
AS $$
select exists(
  select 1
  from public.get_user_entitlement(p_feature_key, p_user_id) e
  where e.enabled=true
);
$$;

CREATE OR REPLACE FUNCTION public.is_platform_owner(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path='public'
AS $$
select exists(
  select 1
  from public.profiles pr
  where pr.id=p_user_id
    and pr.platform_owner=true
    and pr.is_active=true
);
$$;

COMMENT ON COLUMN public.profiles.platform_owner IS 'Internal platform administration flag. This is not a commercial plan, subscription, entitlement, or billing tier.';
COMMENT ON FUNCTION public.is_platform_owner(uuid) IS 'Returns whether the user has the special platform-owner/admin status. This status is separate from commercial plans and subscriptions.';
COMMENT ON FUNCTION public.current_user_plan(uuid) IS 'Returns only the user commercial plan (subscription or Free). Platform-owner/admin status is intentionally excluded.';
COMMENT ON FUNCTION public.get_user_entitlement(text,uuid) IS 'Returns commercial plan entitlements only. Platform-owner/admin privileges are separate and must be checked with is_platform_owner or dedicated admin authorization.';
