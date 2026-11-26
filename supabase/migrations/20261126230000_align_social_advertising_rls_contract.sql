BEGIN;

-- Remove legacy public SELECT policies that bypass moderation.
DROP POLICY IF EXISTS advertisements_select_active_or_own ON public.advertisements;
DROP POLICY IF EXISTS feed_posts_select_public_or_own ON public.feed_posts;
DROP POLICY IF EXISTS reels_select_public_or_own ON public.reels;

-- Publish only active, time-valid and moderator-approved advertisements.
DROP POLICY IF EXISTS advertisements_select_visible_or_own ON public.advertisements;
CREATE POLICY advertisements_select_visible_or_own
ON public.advertisements
FOR SELECT
TO anon, authenticated
USING (
  (status = 'active'
   AND moderation_status = 'approved'
   AND (starts_at IS NULL OR starts_at <= now())
   AND (ends_at IS NULL OR ends_at > now()))
  OR owner_id = (SELECT auth.uid())
);

-- Public social content is visible only after publication and moderation.
DROP POLICY IF EXISTS feed_posts_select_visible_or_own ON public.feed_posts;
CREATE POLICY feed_posts_select_visible_or_own
ON public.feed_posts
FOR SELECT
TO anon, authenticated
USING (
  (visibility = 'public' AND status = 'published' AND moderation_status = 'approved')
  OR owner_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS reels_select_visible_or_own ON public.reels;
CREATE POLICY reels_select_visible_or_own
ON public.reels
FOR SELECT
TO anon, authenticated
USING (
  (visibility = 'public' AND status = 'published' AND moderation_status = 'approved')
  OR owner_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS stories_select_public_or_own ON public.stories;
CREATE POLICY stories_select_public_or_own
ON public.stories
FOR SELECT
TO anon, authenticated
USING (
  (visibility = 'public' AND moderation_status = 'approved' AND expires_at > now())
  OR owner_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS advertisements_admin_select ON public.advertisements;
CREATE POLICY advertisements_admin_select
ON public.advertisements
FOR SELECT TO authenticated
USING ((SELECT is_admin()));

DROP POLICY IF EXISTS feed_posts_admin_select ON public.feed_posts;
CREATE POLICY feed_posts_admin_select
ON public.feed_posts
FOR SELECT TO authenticated
USING ((SELECT is_admin()));

DROP POLICY IF EXISTS reels_admin_select ON public.reels;
CREATE POLICY reels_admin_select
ON public.reels
FOR SELECT TO authenticated
USING ((SELECT is_admin()));

DROP POLICY IF EXISTS stories_admin_select ON public.stories;
CREATE POLICY stories_admin_select
ON public.stories
FOR SELECT TO authenticated
USING ((SELECT is_admin()));

-- One owner/admin write policy per table; the USING and WITH CHECK predicates
-- preserve the same owner/admin boundary for all write operations.
DROP POLICY IF EXISTS advertisements_owner_delete ON public.advertisements;
DROP POLICY IF EXISTS advertisements_owner_insert ON public.advertisements;
DROP POLICY IF EXISTS advertisements_owner_update ON public.advertisements;
DROP POLICY IF EXISTS advertisements_owner_write ON public.advertisements;
CREATE POLICY advertisements_owner_write
ON public.advertisements
FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()));

DROP POLICY IF EXISTS feed_posts_owner_delete ON public.feed_posts;
DROP POLICY IF EXISTS feed_posts_owner_insert ON public.feed_posts;
DROP POLICY IF EXISTS feed_posts_owner_update ON public.feed_posts;
DROP POLICY IF EXISTS feed_posts_owner_write ON public.feed_posts;
CREATE POLICY feed_posts_owner_write
ON public.feed_posts
FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()));

DROP POLICY IF EXISTS reels_owner_delete ON public.reels;
DROP POLICY IF EXISTS reels_owner_insert ON public.reels;
DROP POLICY IF EXISTS reels_owner_update ON public.reels;
DROP POLICY IF EXISTS reels_owner_write ON public.reels;
CREATE POLICY reels_owner_write
ON public.reels
FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()));

DROP POLICY IF EXISTS stories_owner_delete ON public.stories;
DROP POLICY IF EXISTS stories_owner_insert ON public.stories;
DROP POLICY IF EXISTS stories_owner_update ON public.stories;
DROP POLICY IF EXISTS stories_owner_write ON public.stories;
CREATE POLICY stories_owner_write
ON public.stories
FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()));

COMMIT;