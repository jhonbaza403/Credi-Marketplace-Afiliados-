create or replace function public.get_feed_post_stats(p_post_ids uuid[])
returns table(post_id uuid, like_count bigint, comment_count bigint, liked_by_me boolean)
language sql
stable
security invoker
set search_path = public
as $$
  select
    post_id,
    (select count(*) from public.feed_post_likes l where l.post_id = ids.post_id) as like_count,
    (select count(*) from public.feed_post_comments c where c.post_id = ids.post_id) as comment_count,
    exists (select 1 from public.feed_post_likes l where l.post_id = ids.post_id and l.user_id = (select auth.uid())) as liked_by_me
  from unnest(p_post_ids) as ids(post_id);
$$;
