create or replace function public.credichat_is_member(p_conversation_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = coalesce(p_user_id, auth.uid())
  );
$$;

create or replace function public.credichat_member_profile_ids(p_conversation_ids uuid[])
returns table(user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct cm.user_id
  from public.conversation_members cm
  where cm.conversation_id = any(p_conversation_ids)
    and public.credichat_is_member(cm.conversation_id, auth.uid());
$$;

revoke all on function public.credichat_is_member(uuid, uuid) from public, anon;
grant execute on function public.credichat_is_member(uuid, uuid) to authenticated;
revoke all on function public.credichat_member_profile_ids(uuid[]) from public, anon;
grant execute on function public.credichat_member_profile_ids(uuid[]) to authenticated;

drop policy if exists conversation_members_select on public.conversation_members;
create policy conversation_members_select on public.conversation_members
for select to authenticated
using (public.credichat_is_member(conversation_id, auth.uid()));

drop policy if exists conversations_member_select on public.conversations;
create policy conversations_member_select on public.conversations
for select to authenticated
using (public.credichat_is_member(id, auth.uid()));

drop policy if exists conversations_member_update on public.conversations;
create policy conversations_member_update on public.conversations
for update to authenticated
using (public.credichat_is_member(id, auth.uid()))
with check (public.credichat_is_member(id, auth.uid()));

drop policy if exists messages_member_select on public.messages;
create policy messages_member_select on public.messages
for select to authenticated
using (public.credichat_is_member(conversation_id, auth.uid()));

drop policy if exists messages_member_insert on public.messages;
create policy messages_member_insert on public.messages
for insert to authenticated
with check (sender_id = auth.uid() and public.credichat_is_member(conversation_id, auth.uid()));

drop policy if exists message_attachments_member_select on public.message_attachments;
create policy message_attachments_member_select on public.message_attachments
for select to authenticated
using (exists (
  select 1 from public.messages m
  where m.id = message_attachments.message_id
    and public.credichat_is_member(m.conversation_id, auth.uid())
));

drop policy if exists message_attachments_sender_insert on public.message_attachments;
create policy message_attachments_sender_insert on public.message_attachments
for insert to authenticated
with check (exists (
  select 1 from public.messages m
  where m.id = message_attachments.message_id
    and m.sender_id = auth.uid()
    and public.credichat_is_member(m.conversation_id, auth.uid())
));

-- Chat participants need a minimal public profile surface; the UI will no longer request email.
drop policy if exists profiles_select_credichat_members on public.profiles;
create policy profiles_select_credichat_members on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or id in (select public.credichat_member_profile_ids(array(select cm.conversation_id from public.conversation_members cm where cm.user_id = auth.uid())))
);

-- Prevent the helper functions from being called anonymously.
revoke execute on function public.credichat_is_member(uuid, uuid) from anon;
revoke execute on function public.credichat_member_profile_ids(uuid[]) from anon;
