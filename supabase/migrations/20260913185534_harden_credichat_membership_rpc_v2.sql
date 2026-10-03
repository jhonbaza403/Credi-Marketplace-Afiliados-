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
      and coalesce(p_user_id, auth.uid()) = auth.uid()
  );
$$;
