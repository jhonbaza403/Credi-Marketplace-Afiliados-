drop policy if exists feed_post_likes_insert_own on public.feed_post_likes;
create policy feed_post_likes_insert_own on public.feed_post_likes
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.feed_posts p
    where p.id = feed_post_likes.post_id
      and p.visibility = 'public'
      and p.status = 'published'
      and p.moderation_status = 'approved'
  )
);

drop policy if exists feed_post_comments_insert_own on public.feed_post_comments;
create policy feed_post_comments_insert_own on public.feed_post_comments
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.feed_posts p
    where p.id = feed_post_comments.post_id
      and p.visibility = 'public'
      and p.status = 'published'
      and p.moderation_status = 'approved'
  )
);
