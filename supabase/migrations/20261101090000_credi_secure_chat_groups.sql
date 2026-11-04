-- Credi Chat: secure groups with explicit member invitations.
-- Authenticated clients cannot write conversation_members directly.
-- All membership changes happen inside SECURITY DEFINER RPCs with auth.uid() checks.

begin;

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

commit;
