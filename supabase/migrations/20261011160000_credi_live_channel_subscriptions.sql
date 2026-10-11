-- Credi LIVE channel subscriptions: one subscription per viewer/channel pair.
create table if not exists public.chat_live_channel_subscriptions (
  subscriber_id uuid not null references auth.users(id) on delete cascade,
  channel_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint chat_live_channel_subscriptions_pk primary key (subscriber_id, channel_id),
  constraint chat_live_channel_subscriptions_not_self check (subscriber_id <> channel_id)
);

create index if not exists idx_chat_live_channel_subscriptions_channel_created
  on public.chat_live_channel_subscriptions (channel_id, created_at desc);

alter table public.chat_live_channel_subscriptions enable row level security;

drop policy if exists chat_live_channel_subscriptions_select_own on public.chat_live_channel_subscriptions;
create policy chat_live_channel_subscriptions_select_own
  on public.chat_live_channel_subscriptions for select to authenticated
  using (subscriber_id = (select auth.uid()));

drop policy if exists chat_live_channel_subscriptions_insert_own on public.chat_live_channel_subscriptions;
create policy chat_live_channel_subscriptions_insert_own
  on public.chat_live_channel_subscriptions for insert to authenticated
  with check (subscriber_id = (select auth.uid()) and subscriber_id <> channel_id);

drop policy if exists chat_live_channel_subscriptions_delete_own on public.chat_live_channel_subscriptions;
create policy chat_live_channel_subscriptions_delete_own
  on public.chat_live_channel_subscriptions for delete to authenticated
  using (subscriber_id = (select auth.uid()));

create or replace function public.get_live_channel_stats(p_channel_id uuid)
returns table (follower_count bigint, is_following boolean)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    (select count(*) from public.chat_live_channel_subscriptions s where s.channel_id = p_channel_id),
    exists (
      select 1 from public.chat_live_channel_subscriptions s
      where s.channel_id = p_channel_id and s.subscriber_id = auth.uid()
    );
$$;

revoke all on function public.get_live_channel_stats(uuid) from public;
grant execute on function public.get_live_channel_stats(uuid) to authenticated;
