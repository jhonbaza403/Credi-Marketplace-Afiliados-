create extension if not exists pgcrypto;

create table if not exists public.feed_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint feed_post_likes_unique unique (post_id, user_id)
);

create index if not exists feed_post_likes_post_id_idx on public.feed_post_likes(post_id);
create index if not exists feed_post_likes_user_id_idx on public.feed_post_likes(user_id);

create table if not exists public.feed_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feed_post_comments_body_length check (char_length(btrim(body)) between 1 and 2000)
);

create index if not exists feed_post_comments_post_id_created_at_idx on public.feed_post_comments(post_id, created_at desc);
create index if not exists feed_post_comments_user_id_idx on public.feed_post_comments(user_id);

alter table public.feed_post_likes enable row level security;
alter table public.feed_post_comments enable row level security;

create policy feed_post_likes_select_visible on public.feed_post_likes
for select to anon, authenticated
using (
  exists (
    select 1 from public.feed_posts p
    where p.id = feed_post_likes.post_id
      and p.visibility = 'public'
      and p.status = 'published'
      and p.moderation_status = 'approved'
  )
);

create policy feed_post_likes_insert_own on public.feed_post_likes
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy feed_post_likes_delete_own on public.feed_post_likes
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy feed_post_comments_select_visible on public.feed_post_comments
for select to anon, authenticated
using (
  exists (
    select 1 from public.feed_posts p
    where p.id = feed_post_comments.post_id
      and p.visibility = 'public'
      and p.status = 'published'
      and p.moderation_status = 'approved'
  )
);

create policy feed_post_comments_insert_own on public.feed_post_comments
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy feed_post_comments_update_own on public.feed_post_comments
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy feed_post_comments_delete_own on public.feed_post_comments
for delete to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_feed_post_comment_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feed_post_comments_set_updated_at on public.feed_post_comments;
create trigger feed_post_comments_set_updated_at
before update on public.feed_post_comments
for each row execute function public.set_feed_post_comment_updated_at();
