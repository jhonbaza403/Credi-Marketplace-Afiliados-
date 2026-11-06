-- Production forward migration: promote verified Preview-only features.
-- This migration creates only the three feature areas confirmed absent in Production:
-- jobs/professional profiles, secure group invitations, and user feed preferences.
-- It is additive for data/schema, but intentionally removes the legacy direct INSERT
-- policy on conversation_members. Validate application callers before deployment.
-- No existing rows are copied or deleted by this migration.


-- -----------------------------------------------------------------------------
-- Promoted feature: 20261031183000_credi_professional_jobs_and_profiles
-- Original Preview migration SQL, consolidated for a forward-only Production rollout.
-- -----------------------------------------------------------------------------

-- Credi professional network: jobs, applications and user-controlled profiles.
-- Feature-branch migration only. Reconcile the remote migration history and test
-- in a non-production environment before any production rollout.

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references auth.users(id) on delete cascade,
  company text not null check (char_length(trim(company)) between 2 and 150),
  title text not null check (char_length(trim(title)) between 3 and 150),
  description text not null check (char_length(trim(description)) between 30 and 5000),
  category text,
  employment_type text not null default 'full_time'
    check (employment_type in ('full_time','part_time','contract','temporary','internship','freelance')),
  work_mode text not null default 'on_site'
    check (work_mode in ('remote','hybrid','on_site')),
  country text,
  location text,
  salary text,
  salary_min numeric(14,2) check (salary_min is null or salary_min >= 0),
  salary_max numeric(14,2) check (salary_max is null or salary_max >= 0),
  salary_currency char(3) not null default 'USD' check (salary_currency ~ '^[A-Z]{3}$'),
  status text not null default 'active' check (status in ('draft','active','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_salary_range_valid check (
    salary_min is null or salary_max is null or salary_min <= salary_max
  )
);

create index if not exists jobs_active_created_idx on public.jobs (created_at desc) where status = 'active';
create index if not exists jobs_employer_created_idx on public.jobs (employer_id, created_at desc);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_id uuid not null references auth.users(id) on delete cascade,
  cover_letter text check (cover_letter is null or char_length(cover_letter) <= 5000),
  resume_path text,
  status text not null default 'pending' check (status in ('pending','reviewed','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_applications_one_per_candidate unique (job_id, candidate_id)
);

create index if not exists job_applications_candidate_created_idx on public.job_applications (candidate_id, created_at desc);
create index if not exists job_applications_job_status_idx on public.job_applications (job_id, status, created_at desc);

create table if not exists public.professional_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) <= 150),
  headline text check (headline is null or char_length(headline) <= 180),
  summary text check (summary is null or char_length(summary) <= 5000),
  location text check (location is null or char_length(location) <= 180),
  skills text[] not null default '{}',
  experience jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  website_url text,
  portfolio_url text,
  visibility text not null default 'private' check (visibility in ('private','public')),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_credi_jobs_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists jobs_touch_updated_at on public.jobs;
create trigger jobs_touch_updated_at before update on public.jobs
for each row execute function public.touch_credi_jobs_updated_at();

drop trigger if exists job_applications_touch_updated_at on public.job_applications;
create trigger job_applications_touch_updated_at before update on public.job_applications
for each row execute function public.touch_credi_jobs_updated_at();

drop trigger if exists professional_profiles_touch_updated_at on public.professional_profiles;
create trigger professional_profiles_touch_updated_at before update on public.professional_profiles
for each row execute function public.touch_credi_jobs_updated_at();

alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.professional_profiles enable row level security;

drop policy if exists jobs_read_active_or_own on public.jobs;
create policy jobs_read_active_or_own on public.jobs for select to anon, authenticated
using (status = 'active' or employer_id = (select auth.uid()));

drop policy if exists jobs_insert_own on public.jobs;
create policy jobs_insert_own on public.jobs for insert to authenticated
with check (employer_id = (select auth.uid()));

drop policy if exists jobs_update_own on public.jobs;
create policy jobs_update_own on public.jobs for update to authenticated
using (employer_id = (select auth.uid()))
with check (employer_id = (select auth.uid()));

drop policy if exists jobs_delete_own on public.jobs;
create policy jobs_delete_own on public.jobs for delete to authenticated
using (employer_id = (select auth.uid()));

drop policy if exists job_applications_read_candidate_or_employer on public.job_applications;
create policy job_applications_read_candidate_or_employer on public.job_applications for select to authenticated
using (
  candidate_id = (select auth.uid())
  or exists (
    select 1 from public.jobs j
    where j.id = job_applications.job_id and j.employer_id = (select auth.uid())
  )
);

drop policy if exists job_applications_insert_candidate on public.job_applications;
create policy job_applications_insert_candidate on public.job_applications for insert to authenticated
with check (
  candidate_id = (select auth.uid())
  and exists (
    select 1 from public.jobs j
    where j.id = job_applications.job_id
      and j.status = 'active'
      and j.employer_id <> (select auth.uid())
  )
);

-- Authenticated users may not update application records directly. A future
-- employer review endpoint/RPC must expose a status-only transition.

drop policy if exists professional_profiles_read_visible_or_own on public.professional_profiles;
create policy professional_profiles_read_visible_or_own on public.professional_profiles for select to authenticated
using (visibility = 'public' or user_id = (select auth.uid()));

drop policy if exists professional_profiles_insert_own on public.professional_profiles;
create policy professional_profiles_insert_own on public.professional_profiles for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists professional_profiles_update_own on public.professional_profiles;
create policy professional_profiles_update_own on public.professional_profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant select on public.jobs to anon, authenticated;
grant insert, update, delete on public.jobs to authenticated;
grant select, insert on public.job_applications to authenticated;
grant select, insert, update on public.professional_profiles to authenticated;


-- -----------------------------------------------------------------------------
-- Promoted feature: 20261101090000_credi_secure_chat_groups
-- Original Preview migration SQL, consolidated for a forward-only Production rollout.
-- -----------------------------------------------------------------------------

-- Credi Chat: secure groups with explicit member invitations.
-- Authenticated clients cannot write conversation_members directly.
-- All membership changes happen inside SECURITY DEFINER RPCs with auth.uid() checks.

create table if not exists public.conversation_invitations (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','revoked','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  responded_at timestamptz,
  constraint conversation_invitation_not_self check (inviter_id <> invitee_id)
);

create unique index if not exists conversation_invitations_active_uq
  on public.conversation_invitations(conversation_id, invitee_id)
  where status in ('pending','accepted');

create index if not exists conversation_invitations_invitee_pending_idx
  on public.conversation_invitations(invitee_id, created_at desc)
  where status = 'pending';

alter table public.conversation_invitations enable row level security;

drop policy if exists conversation_invitations_participant_select on public.conversation_invitations;
create policy conversation_invitations_participant_select
on public.conversation_invitations for select to authenticated
using (inviter_id = (select auth.uid()) or invitee_id = (select auth.uid()));

revoke all on public.conversation_invitations from public, anon, authenticated;
grant select on public.conversation_invitations to authenticated;
revoke insert on public.conversation_members from public, anon, authenticated;

-- This removes the unsafe legacy policy that let any user self-join any
-- conversation when its UUID was known.
drop policy if exists conversation_members_insert on public.conversation_members;

create or replace function public.create_credichat_group_conversation(
  p_title text,
  p_member_user_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_member_ids uuid[];
  v_conversation_id uuid;
  v_input_count integer;
begin
  if v_actor is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;

  if v_title is null or char_length(v_title) < 2 or char_length(v_title) > 120 then
    raise exception 'INVALID_GROUP_TITLE' using errcode = '22023';
  end if;

  if p_member_user_ids is null then
    raise exception 'GROUP_MEMBERS_REQUIRED' using errcode = '22023';
  end if;

  v_input_count := cardinality(p_member_user_ids);
  if v_input_count < 2 or v_input_count > 24 then
    raise exception 'GROUP_MEMBER_LIMIT_EXCEEDED' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_member_user_ids) as requested(user_id)
    where requested.user_id is null or requested.user_id = v_actor
  ) then
    raise exception 'INVALID_GROUP_MEMBER' using errcode = '22023';
  end if;

  select array_agg(distinct requested.user_id order by requested.user_id)
    into v_member_ids
  from unnest(p_member_user_ids) as requested(user_id);

  if coalesce(cardinality(v_member_ids), 0) < 2 then
    raise exception 'GROUP_REQUIRES_TWO_INVITATIONS' using errcode = '22023';
  end if;

  if (
    select count(*)
    from auth.users u
    where u.id = any(v_member_ids)
  ) <> cardinality(v_member_ids) then
    raise exception 'GROUP_MEMBER_NOT_FOUND' using errcode = '23503';
  end if;

  insert into public.conversations (kind, title, created_by, metadata)
  values (
    'group',
    v_title,
    v_actor,
    jsonb_build_object('created_via', 'credichat_group_rpc', 'membership_version', 2)
  )
  returning id into v_conversation_id;

  -- Only the creator becomes a member immediately. Invitees join after
  -- accepting their own invitation via respond_credichat_group_invitation.
  insert into public.conversation_members (conversation_id, user_id, member_role)
  values (v_conversation_id, v_actor, 'admin');

  insert into public.conversation_invitations (
    conversation_id, inviter_id, invitee_id, status
  )
  select v_conversation_id, v_actor, member_id, 'pending'
  from unnest(v_member_ids) as requested(member_id);

  return v_conversation_id;
end;
$function$;

create or replace function public.invite_credichat_group_member(
  p_conversation_id uuid,
  p_target_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_created_by uuid;
  v_kind text;
  v_invitation_count integer;
  v_invitation_id uuid;
begin
  if v_actor is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;

  if p_conversation_id is null or p_target_user_id is null or p_target_user_id = v_actor then
    raise exception 'INVALID_GROUP_MEMBER' using errcode = '22023';
  end if;

  select c.created_by, c.kind
    into v_created_by, v_kind
  from public.conversations c
  where c.id = p_conversation_id
  for update;

  if not found then
    raise exception 'CONVERSATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_kind <> 'group' then
    raise exception 'GROUP_INVITATIONS_ONLY' using errcode = '22023';
  end if;

  if v_created_by <> v_actor and not exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = v_actor
      and cm.member_role = 'admin'
  ) then
    raise exception 'NOT_AUTHORIZED_TO_MANAGE_GROUP' using errcode = '42501';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_target_user_id) then
    raise exception 'GROUP_MEMBER_NOT_FOUND' using errcode = '23503';
  end if;

  if exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.user_id = p_target_user_id
  ) then
    raise exception 'ALREADY_GROUP_MEMBER' using errcode = '23505';
  end if;

  select i.id into v_invitation_id
  from public.conversation_invitations i
  where i.conversation_id = p_conversation_id
    and i.invitee_id = p_target_user_id
    and i.status in ('pending','accepted')
  order by i.created_at desc
  limit 1;

  if v_invitation_id is not null then
    return v_invitation_id;
  end if;

  select count(*)::integer into v_invitation_count
  from public.conversation_invitations i
  where i.conversation_id = p_conversation_id
    and i.status in ('pending','accepted');

  if v_invitation_count >= 24 then
    raise exception 'GROUP_INVITATION_LIMIT_EXCEEDED' using errcode = '22023';
  end if;

  insert into public.conversation_invitations (
    conversation_id, inviter_id, invitee_id, status
  )
  values (p_conversation_id, v_actor, p_target_user_id, 'pending')
  on conflict (conversation_id, invitee_id) where status in ('pending','accepted')
  do nothing
  returning id into v_invitation_id;

  if v_invitation_id is null then
    select i.id into v_invitation_id
    from public.conversation_invitations i
    where i.conversation_id = p_conversation_id
      and i.invitee_id = p_target_user_id
      and i.status in ('pending','accepted')
    order by i.created_at desc
    limit 1;
  end if;

  return v_invitation_id;
end;
$function$;

create or replace function public.list_my_credichat_group_invitations()
returns table (
  invitation_id uuid,
  conversation_id uuid,
  group_title text,
  inviter_id uuid,
  inviter_name text,
  invited_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    i.id,
    i.conversation_id,
    c.title,
    i.inviter_id,
    coalesce(p.full_name, 'Participante Credi'),
    i.created_at,
    i.expires_at
  from public.conversation_invitations i
  join public.conversations c on c.id = i.conversation_id and c.kind = 'group'
  left join public.profiles p on p.id = i.inviter_id
  where (select auth.uid()) is not null
    and i.invitee_id = (select auth.uid())
    and i.status = 'pending'
    and i.expires_at > now()
  order by i.created_at desc
  limit 100;
$function$;

create or replace function public.respond_credichat_group_invitation(
  p_invitation_id uuid,
  p_accept boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_invitation public.conversation_invitations%rowtype;
  v_kind text;
  v_admin_exists boolean;
begin
  if v_actor is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;

  if p_invitation_id is null or p_accept is null then
    raise exception 'INVALID_INVITATION_RESPONSE' using errcode = '22023';
  end if;

  select *
    into v_invitation
  from public.conversation_invitations i
  where i.id = p_invitation_id
    and i.invitee_id = v_actor
    and i.status = 'pending'
  for update;

  if not found then
    raise exception 'INVITATION_NOT_FOUND_OR_ALREADY_HANDLED' using errcode = 'P0002';
  end if;

  select c.kind into v_kind
  from public.conversations c
  where c.id = v_invitation.conversation_id;

  if v_kind <> 'group' then
    update public.conversation_invitations
    set status = 'revoked', responded_at = now()
    where id = p_invitation_id;
    return false;
  end if;

  if v_invitation.expires_at <= now() then
    update public.conversation_invitations
    set status = 'expired', responded_at = now()
    where id = p_invitation_id;
    return false;
  end if;

  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = v_invitation.conversation_id
      and cm.user_id = v_invitation.inviter_id
      and cm.member_role = 'admin'
  ) into v_admin_exists;

  if not v_admin_exists then
    update public.conversation_invitations
    set status = 'revoked', responded_at = now()
    where id = p_invitation_id;
    return false;
  end if;

  if p_accept then
    insert into public.conversation_members (conversation_id, user_id, member_role)
    values (v_invitation.conversation_id, v_actor, 'member')
    on conflict (conversation_id, user_id) do nothing;

    update public.conversation_invitations
    set status = 'accepted', responded_at = now()
    where id = p_invitation_id;
  else
    update public.conversation_invitations
    set status = 'declined', responded_at = now()
    where id = p_invitation_id;
  end if;

  return true;
end;
$function$;

revoke all on function public.create_credichat_group_conversation(text, uuid[]) from public, anon;
grant execute on function public.create_credichat_group_conversation(text, uuid[]) to authenticated;
revoke all on function public.invite_credichat_group_member(uuid, uuid) from public, anon;
grant execute on function public.invite_credichat_group_member(uuid, uuid) to authenticated;
revoke all on function public.list_my_credichat_group_invitations() from public, anon;
grant execute on function public.list_my_credichat_group_invitations() to authenticated;
revoke all on function public.respond_credichat_group_invitation(uuid, boolean) from public, anon;
grant execute on function public.respond_credichat_group_invitation(uuid, boolean) to authenticated;


-- -----------------------------------------------------------------------------
-- Promoted feature: 20261102100000_social_feed_preferences
-- Original Preview migration SQL, consolidated for a forward-only Production rollout.
-- -----------------------------------------------------------------------------

-- Explicit, user-controlled social-feed preferences.
-- Store only topics selected by the user; never infer sensitive traits.

create table if not exists public.social_feed_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  interests text[] not null default '{}'::text[],
  feed_mode text not null default 'chronological'
    check (feed_mode in ('chronological','interests')),
  updated_at timestamptz not null default now(),
  constraint social_feed_preferences_interest_count check (cardinality(interests) <= 8),
  constraint social_feed_preferences_interest_values check (
    array_position(interests, null) is null
    and interests <@ array[
      'technology','business','commerce','fashion','food',
      'education','sports','culture','travel','home'
    ]::text[]
  )
);

alter table public.social_feed_preferences enable row level security;

drop policy if exists social_feed_preferences_select_own on public.social_feed_preferences;
create policy social_feed_preferences_select_own
on public.social_feed_preferences for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists social_feed_preferences_insert_own on public.social_feed_preferences;
create policy social_feed_preferences_insert_own
on public.social_feed_preferences for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists social_feed_preferences_update_own on public.social_feed_preferences;
create policy social_feed_preferences_update_own
on public.social_feed_preferences for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists social_feed_preferences_delete_own on public.social_feed_preferences;
create policy social_feed_preferences_delete_own
on public.social_feed_preferences for delete to authenticated
using (user_id = (select auth.uid()));

revoke all on public.social_feed_preferences from public, anon, authenticated;
grant select, insert, update, delete on public.social_feed_preferences to authenticated;
