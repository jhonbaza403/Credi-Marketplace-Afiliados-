-- Credi Marketplace
-- Account access hardening: explicit plan activation, mandatory MFA/security key,
-- and private identity profile photos for KYC onboarding.

begin;

create table if not exists public.profile_verification_photos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  front_path text,
  left_path text,
  right_path text,
  status text not null default 'not_submitted'
    check (status in ('not_submitted','submitted','approved','rejected')),
  rejection_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status = 'not_submitted'
    or (front_path is not null and left_path is not null and right_path is not null)
  )
);

create index if not exists profile_verification_photos_status_idx
  on public.profile_verification_photos(status, updated_at desc);

drop trigger if exists profile_verification_photos_updated_at on public.profile_verification_photos;
create trigger profile_verification_photos_updated_at
before update on public.profile_verification_photos
for each row execute function public.set_compliance_updated_at();

alter table public.profile_verification_photos enable row level security;

drop policy if exists profile_verification_photos_owner_select on public.profile_verification_photos;
create policy profile_verification_photos_owner_select
on public.profile_verification_photos for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists profile_verification_photos_admin_select on public.profile_verification_photos;
create policy profile_verification_photos_admin_select
on public.profile_verification_photos for select
to authenticated
using ((select public.is_admin()));

revoke all on public.profile_verification_photos from anon, authenticated;
grant select on public.profile_verification_photos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'identity-profile-private',
  'identity-profile-private',
  false,
  15728640,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

create or replace function public.credi_account_security_status(
  p_user_id uuid default auth.uid()
)
returns table(
  is_platform_owner boolean,
  is_admin boolean,
  has_active_subscription boolean,
  has_mfa boolean,
  has_security_key boolean,
  has_profile_photos boolean,
  identity_approved boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with p as (
    select
      coalesce(platform_owner, false) as platform_owner,
      role = 'admin'::public.user_role as admin
    from public.profiles
    where id = p_user_id
    limit 1
  )
  select
    coalesce((select platform_owner from p), false),
    coalesce((select admin from p), false),
    exists (
      select 1
      from public.subscriptions s
      where s.user_id = p_user_id
        and s.status in ('active','trialing')
        and (
          s.current_period_end is null
          or s.current_period_end > now()
          or s.billing_interval = 'free'
        )
    ),
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2',
    coalesce(auth.jwt() -> 'app_metadata' ->> 'security_key_enrolled', 'false') = 'true',
    exists (
      select 1
      from public.profile_verification_photos v
      where v.user_id = p_user_id
        and v.status in ('submitted','approved')
        and v.front_path is not null
        and v.left_path is not null
        and v.right_path is not null
    ),
    exists (
      select 1
      from public.kyc_cases k
      where k.user_id = p_user_id
        and k.status = 'approved'
        and (k.expires_at is null or k.expires_at > now())
    );
$$;

revoke all on function public.credi_account_security_status(uuid) from public, anon;
grant execute on function public.credi_account_security_status(uuid) to authenticated;

revoke all on function public.get_credi_operation_timeline(uuid) from public, anon, authenticated;
grant execute on function public.get_credi_operation_timeline(uuid) to service_role;

create or replace function public.current_user_plan(p_user_id uuid default auth.uid())
returns table(
  plan_id uuid,
  plan_code text,
  plan_name text,
  status text,
  billing_interval text,
  limits jsonb
)
language sql
stable
security invoker
set search_path = public
as $
  select p.id, p.code, p.name, s.status, s.billing_interval, p.limits
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
    and p.is_active = true
  order by s.created_at desc
  limit 1;
$;

create or replace function public.get_user_entitlement(
  p_feature_key text,
  p_user_id uuid default auth.uid()
)
returns table(enabled boolean, quota bigint, plan_code text)
language sql
stable
security invoker
set search_path = public
as $
  select pf.enabled, pf.quota, c.plan_code
  from public.current_user_plan(p_user_id) c
  join public.plan_features pf on pf.plan_id = c.plan_id
  where pf.feature_key = p_feature_key
  limit 1;
$;

create or replace function public.user_has_plan_feature(
  p_feature_key text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and (coalesce(p.platform_owner, false) or p.role = 'admin'::public.user_role)
  )
  or exists (
    select 1 from public.get_user_entitlement(p_feature_key, p_user_id) e
    where e.enabled = true
  );
$;

commit;
