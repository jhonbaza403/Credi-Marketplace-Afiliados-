-- Explicit, user-controlled social-feed preferences.
-- Store only topics selected by the user; never infer sensitive traits.

begin;

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

commit;
