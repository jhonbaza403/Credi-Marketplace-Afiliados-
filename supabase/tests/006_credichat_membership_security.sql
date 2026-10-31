-- Regression contract for Credi Chat membership and invitation boundaries.
-- Run after 20261101090000_credi_secure_chat_groups.sql in a Supabase staging database.

begin;

do $$
declare
  v_policy_count integer;
  v_create oid;
  v_invite oid;
  v_list oid;
  v_respond oid;
begin
  -- No authenticated row-policy may directly insert or update membership rows.
  select count(*) into v_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'conversation_members'
    and cmd in ('INSERT','ALL');

  if v_policy_count <> 0 then
    raise exception 'FAIL: a direct conversation_members INSERT/ALL policy exists';
  end if;

  if has_table_privilege('authenticated', 'public.conversation_members', 'INSERT')
     or has_table_privilege('anon', 'public.conversation_members', 'INSERT') then
    raise exception 'FAIL: direct conversation_members INSERT grant remains on a client role';
  end if;

  v_create := to_regprocedure('public.create_credichat_group_conversation(text,uuid[])');
  v_invite := to_regprocedure('public.invite_credichat_group_member(uuid,uuid)');
  v_list := to_regprocedure('public.list_my_credichat_group_invitations()');
  v_respond := to_regprocedure('public.respond_credichat_group_invitation(uuid,boolean)');

  if v_create is null or v_invite is null or v_list is null or v_respond is null then
    raise exception 'FAIL: one or more guarded group RPCs are missing';
  end if;

  if not has_function_privilege('authenticated', v_create, 'EXECUTE')
     or not has_function_privilege('authenticated', v_invite, 'EXECUTE')
     or not has_function_privilege('authenticated', v_list, 'EXECUTE')
     or not has_function_privilege('authenticated', v_respond, 'EXECUTE') then
    raise exception 'FAIL: authenticated role cannot execute the guarded group RPCs';
  end if;

  if has_function_privilege('anon', v_create, 'EXECUTE')
     or has_function_privilege('anon', v_invite, 'EXECUTE')
     or has_function_privilege('anon', v_list, 'EXECUTE')
     or has_function_privilege('anon', v_respond, 'EXECUTE') then
    raise exception 'FAIL: anonymous role can execute group RPCs';
  end if;

  if exists (
    select 1
    from unnest(array[v_create,v_invite,v_list,v_respond]) as fn(oid)
    join pg_proc p on p.oid = fn.oid
    where p.prosecdef is not true
  ) then
    raise exception 'FAIL: group RPCs must use SECURITY DEFINER with explicit auth.uid() checks';
  end if;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'conversation_invitations'
      and c.relrowsecurity = true
  ) then
    raise exception 'FAIL: conversation_invitations must have RLS enabled';
  end if;

  if not has_table_privilege('authenticated', 'public.conversation_invitations', 'SELECT')
     or has_table_privilege('authenticated', 'public.conversation_invitations', 'INSERT')
     or has_table_privilege('authenticated', 'public.conversation_invitations', 'UPDATE')
     or has_table_privilege('anon', 'public.conversation_invitations', 'SELECT') then
    raise exception 'FAIL: invitation table privileges are broader than owner/recipient read';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'conversation_invitations'
      and cmd = 'SELECT'
      and qual like '%inviter_id%'
      and qual like '%invitee_id%'
  ) then
    raise exception 'FAIL: invitations do not have an inviter/recipient read boundary';
  end if;
end;
$$;

rollback;
