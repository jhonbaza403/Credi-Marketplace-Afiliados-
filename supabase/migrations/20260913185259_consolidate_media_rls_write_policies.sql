drop policy if exists advertisements_owner_write on public.advertisements;
create policy advertisements_owner_insert on public.advertisements for insert to authenticated with check ((select auth.uid()) = owner_id or is_admin());
create policy advertisements_owner_update on public.advertisements for update to authenticated using ((select auth.uid()) = owner_id or is_admin()) with check ((select auth.uid()) = owner_id or is_admin());
create policy advertisements_owner_delete on public.advertisements for delete to authenticated using ((select auth.uid()) = owner_id or is_admin());

drop policy if exists feed_posts_owner_write on public.feed_posts;
create policy feed_posts_owner_insert on public.feed_posts for insert to authenticated with check ((select auth.uid()) = owner_id or is_admin());
create policy feed_posts_owner_update on public.feed_posts for update to authenticated using ((select auth.uid()) = owner_id or is_admin()) with check ((select auth.uid()) = owner_id or is_admin());
create policy feed_posts_owner_delete on public.feed_posts for delete to authenticated using ((select auth.uid()) = owner_id or is_admin());

drop policy if exists reels_owner_write on public.reels;
create policy reels_owner_insert on public.reels for insert to authenticated with check ((select auth.uid()) = owner_id or is_admin());
create policy reels_owner_update on public.reels for update to authenticated using ((select auth.uid()) = owner_id or is_admin()) with check ((select auth.uid()) = owner_id or is_admin());
create policy reels_owner_delete on public.reels for delete to authenticated using ((select auth.uid()) = owner_id or is_admin());

drop policy if exists stories_owner_write on public.stories;
create policy stories_owner_insert on public.stories for insert to authenticated with check ((select auth.uid()) = owner_id or is_admin());
create policy stories_owner_update on public.stories for update to authenticated using ((select auth.uid()) = owner_id or is_admin()) with check ((select auth.uid()) = owner_id or is_admin());
create policy stories_owner_delete on public.stories for delete to authenticated using ((select auth.uid()) = owner_id or is_admin());
