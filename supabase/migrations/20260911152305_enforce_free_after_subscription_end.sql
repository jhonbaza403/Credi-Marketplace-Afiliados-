create or replace function public.current_user_plan(p_user_id uuid default auth.uid())
returns table(plan_id uuid, plan_code text, plan_name text, status text, billing_interval text, limits jsonb)
language sql
stable
set search_path to 'public'
as $function$
  with effective as (
    select p.id, p.code, p.name, s.status, s.billing_interval, p.limits, s.created_at,
           s.cancelled_at, s.current_period_end, s.cancel_at_period_end
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.user_id = p_user_id
      and s.status in ('trialing','active')
      and (
        s.status = 'trialing'
        or s.cancel_at_period_end = false
        or s.current_period_end is null
        or s.current_period_end > now()
      )
    order by s.created_at desc
    limit 1
  )
  select id, code, name, status, billing_interval, limits from effective
  union all
  select p.id, p.code, p.name, 'active', 'free', p.limits
  from public.plans p
  where p.code='free'
    and p.is_active=true
    and not exists(select 1 from effective)
  limit 1;
$function$;

comment on function public.current_user_plan(uuid) is 'Returns the effective commercial plan. Ended, cancelled, paused and past-due subscriptions fall back to Free; cancel-at-period-end remains active only until the current period ends.';
