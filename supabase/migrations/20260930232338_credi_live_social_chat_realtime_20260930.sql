alter table public.chat_live_messages drop constraint if exists chat_live_messages_body_check;
alter table public.chat_live_messages add constraint chat_live_messages_body_check check (char_length(btrim(body)) between 1 and 500);
create index if not exists idx_chat_live_messages_room_created on public.chat_live_messages(room_id, created_at desc);
create index if not exists idx_chat_live_reactions_room_created on public.chat_live_reactions(room_id, created_at desc);
create index if not exists idx_chat_live_blocked_keywords_room on public.chat_live_blocked_keywords(room_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_live_messages'
  ) then
    alter publication supabase_realtime add table public.chat_live_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_live_reactions'
  ) then
    alter publication supabase_realtime add table public.chat_live_reactions;
  end if;
end $$;

drop policy if exists chat_live_messages_delete_host_moderator on public.chat_live_messages;
create policy chat_live_messages_delete_host_moderator
on public.chat_live_messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.chat_live_rooms r
    where r.id=chat_live_messages.room_id
      and (
        r.host_user_id=(select auth.uid())
        or exists (
          select 1 from public.chat_live_moderators m
          where m.room_id=r.id and m.user_id=(select auth.uid())
            and coalesce((m.permissions->>'delete_comment')::boolean,false)
        )
      )
  )
);

drop policy if exists chat_live_reactions_select_live on public.chat_live_reactions;
create policy chat_live_reactions_select_live
on public.chat_live_reactions
for select
to authenticated
using (
  exists (
    select 1 from public.chat_live_rooms r
    where r.id=chat_live_reactions.room_id and r.status='live'
  )
);
