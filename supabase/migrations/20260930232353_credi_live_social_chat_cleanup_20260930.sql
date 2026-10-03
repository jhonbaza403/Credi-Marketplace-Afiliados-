drop index if exists public.idx_chat_live_messages_room_created;
drop index if exists public.idx_chat_live_reactions_room_created;
drop policy if exists chat_live_reactions_select_live on public.chat_live_reactions;
