create table if not exists public.chat_live_rooms (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  title text not null default 'Credi Live',
  status text not null default 'live' check (status in ('live','ended')),
  viewer_count integer not null default 0 check (viewer_count >= 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_live_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_live_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 280),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists chat_live_rooms_status_idx on public.chat_live_rooms(status, started_at desc);
create index if not exists chat_live_messages_room_created_idx on public.chat_live_messages(room_id, created_at desc);

alter table public.chat_live_rooms enable row level security;
alter table public.chat_live_messages enable row level security;

drop policy if exists chat_live_rooms_select_authenticated on public.chat_live_rooms;
create policy chat_live_rooms_select_authenticated on public.chat_live_rooms for select to authenticated using (status = 'live' or host_user_id = auth.uid());
drop policy if exists chat_live_rooms_insert_host on public.chat_live_rooms;
create policy chat_live_rooms_insert_host on public.chat_live_rooms for insert to authenticated with check (host_user_id = auth.uid());
drop policy if exists chat_live_rooms_update_host on public.chat_live_rooms;
create policy chat_live_rooms_update_host on public.chat_live_rooms for update to authenticated using (host_user_id = auth.uid()) with check (host_user_id = auth.uid());

drop policy if exists chat_live_messages_select_authenticated on public.chat_live_messages;
create policy chat_live_messages_select_authenticated on public.chat_live_messages for select to authenticated using (exists (select 1 from public.chat_live_rooms r where r.id = room_id and (r.status = 'live' or r.host_user_id = auth.uid())));
drop policy if exists chat_live_messages_insert_authenticated on public.chat_live_messages;
create policy chat_live_messages_insert_authenticated on public.chat_live_messages for insert to authenticated with check (sender_id = auth.uid() and exists (select 1 from public.chat_live_rooms r where r.id = room_id and r.status = 'live'));
drop policy if exists chat_live_messages_update_own on public.chat_live_messages;
create policy chat_live_messages_update_own on public.chat_live_messages for update to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid());

alter table public.business_catalogs add column if not exists video_media jsonb not null default '[]'::jsonb;

create or replace function public.touch_credichat_conversation_updated_at()
returns trigger language plpgsql security invoker set search_path = public
as $$ begin update public.conversations set updated_at = now() where id = new.conversation_id; return new; end $$;

drop trigger if exists trg_touch_credichat_conversation_on_message on public.messages;
create trigger trg_touch_credichat_conversation_on_message after insert on public.messages for each row execute function public.touch_credichat_conversation_updated_at();

-- Authorize Credi LIVE private Realtime topics.
drop policy if exists credichat_live_broadcast_read on realtime.messages;
create policy credichat_live_broadcast_read on realtime.messages for select to authenticated using (
  extension = 'broadcast' and exists (
    select 1 from public.chat_live_rooms r
    where r.id = ((regexp_match(realtime.topic(), '^credichat-live-([0-9a-f-]{36})$'))[1])::uuid
      and r.status = 'live'
  )
);
drop policy if exists credichat_live_broadcast_write on realtime.messages;
create policy credichat_live_broadcast_write on realtime.messages for insert to authenticated with check (
  extension = 'broadcast' and exists (
    select 1 from public.chat_live_rooms r
    where r.id = ((regexp_match(realtime.topic(), '^credichat-live-([0-9a-f-]{36})$'))[1])::uuid
      and r.status = 'live'
  )
);
drop policy if exists credichat_live_presence_read on realtime.messages;
create policy credichat_live_presence_read on realtime.messages for select to authenticated using (
  extension = 'presence' and exists (
    select 1 from public.chat_live_rooms r
    where r.id = ((regexp_match(realtime.topic(), '^credichat-live-([0-9a-f-]{36})$'))[1])::uuid
      and r.status = 'live'
  )
);
drop policy if exists credichat_live_presence_write on realtime.messages;
create policy credichat_live_presence_write on realtime.messages for insert to authenticated with check (
  extension = 'presence' and exists (
    select 1 from public.chat_live_rooms r
    where r.id = ((regexp_match(realtime.topic(), '^credichat-live-([0-9a-f-]{36})$'))[1])::uuid
      and r.status = 'live'
  )
);

create or replace function public.broadcast_credichat_live_message()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform realtime.broadcast_changes(
    'credichat-live-' || new.room_id::text,
    'message',
    'INSERT',
    new,
    null
  );
  return new;
end;
$$;

drop trigger if exists trg_broadcast_credichat_live_message on public.chat_live_messages;
create trigger trg_broadcast_credichat_live_message
after insert on public.chat_live_messages
for each row execute function public.broadcast_credichat_live_message();
