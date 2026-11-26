BEGIN;

-- Public social content must be moderated before anonymous/public visibility.
DROP POLICY IF EXISTS feed_posts_select_public_or_own ON public.feed_posts;
DROP POLICY IF EXISTS reels_select_public_or_own ON public.reels;
DROP POLICY IF EXISTS feed_posts_select_visible_or_own ON public.feed_posts;
CREATE POLICY feed_posts_select_visible_or_own
ON public.feed_posts
FOR SELECT
TO anon, authenticated
USING (
  (visibility = 'public' AND status = 'published' AND moderation_status = 'approved')
  OR owner_id = (SELECT auth.uid())
  OR (SELECT is_admin())
);

DROP POLICY IF EXISTS reels_select_public_or_own ON public.reels;
DROP POLICY IF EXISTS reels_select_visible_or_own ON public.reels;
CREATE POLICY reels_select_visible_or_own
ON public.reels
FOR SELECT
TO anon, authenticated
USING (
  (visibility = 'public' AND status = 'published' AND moderation_status = 'approved')
  OR owner_id = (SELECT auth.uid())
  OR (SELECT is_admin())
);

DROP POLICY IF EXISTS stories_select_public_or_own ON public.stories;
CREATE POLICY stories_select_public_or_own
ON public.stories
FOR SELECT
TO anon, authenticated
USING (
  (visibility = 'public' AND moderation_status = 'approved' AND expires_at > now())
  OR owner_id = (SELECT auth.uid())
  OR (SELECT is_admin())
);

-- Consolidate duplicated per-action owner rules into one equivalent owner policy.
DROP POLICY IF EXISTS feed_posts_owner_delete ON public.feed_posts;
DROP POLICY IF EXISTS feed_posts_owner_insert ON public.feed_posts;
DROP POLICY IF EXISTS feed_posts_owner_update ON public.feed_posts;
DROP POLICY IF EXISTS feed_posts_owner_write ON public.feed_posts;
CREATE POLICY feed_posts_owner_write
ON public.feed_posts
FOR ALL
TO authenticated
USING (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()));

DROP POLICY IF EXISTS reels_owner_delete ON public.reels;
DROP POLICY IF EXISTS reels_owner_insert ON public.reels;
DROP POLICY IF EXISTS reels_owner_update ON public.reels;
DROP POLICY IF EXISTS reels_owner_write ON public.reels;
CREATE POLICY reels_owner_write
ON public.reels
FOR ALL
TO authenticated
USING (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()));

DROP POLICY IF EXISTS stories_owner_delete ON public.stories;
DROP POLICY IF EXISTS stories_owner_insert ON public.stories;
DROP POLICY IF EXISTS stories_owner_update ON public.stories;
DROP POLICY IF EXISTS stories_owner_write ON public.stories;
CREATE POLICY stories_owner_write
ON public.stories
FOR ALL
TO authenticated
USING (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()));

-- The host may feature only an active, in-stock product belonging to their active store.
DROP POLICY IF EXISTS chat_live_products_host_write ON public.chat_live_products;
CREATE POLICY chat_live_products_host_write
ON public.chat_live_products
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_live_rooms r
    WHERE r.id = chat_live_products.room_id
      AND r.host_user_id = (SELECT auth.uid())
  )
  AND EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = chat_live_products.product_id
      AND p.is_active = true
      AND p.stock > 0
      AND s.vendor_id = (SELECT auth.uid())
      AND s.is_active = true
  )
);

DROP POLICY IF EXISTS chat_live_products_host_update_delete ON public.chat_live_products;
CREATE POLICY chat_live_products_host_update_delete
ON public.chat_live_products
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_live_rooms r
    WHERE r.id = chat_live_products.room_id
      AND r.host_user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_live_rooms r
    WHERE r.id = chat_live_products.room_id
      AND r.host_user_id = (SELECT auth.uid())
  )
  AND EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = chat_live_products.product_id
      AND p.is_active = true
      AND p.stock > 0
      AND s.vendor_id = (SELECT auth.uid())
      AND s.is_active = true
  )
);

-- Keep public read access only where a public SELECT policy exists.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.feed_posts, public.reels, public.stories FROM anon;
REVOKE ALL ON TABLE public.chat_live_products FROM anon;
REVOKE ALL ON TABLE public.social_accounts, public.social_publications FROM anon;
REVOKE ALL ON TABLE
  public.wallet_journals,
  public.wallet_refunds,
  public.settlement_account_bindings,
  public.settlement_approval_audit,
  public.settlement_payout_audit
FROM anon, authenticated;

COMMIT;
