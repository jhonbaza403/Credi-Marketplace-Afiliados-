-- Credi Marketplace: RLS init-plan + FK index hardening
-- Preserves authorization semantics while allowing auth.uid() to be
-- evaluated as an init-plan expression and covering foreign keys.

DROP POLICY IF EXISTS carts_select_own ON public.carts;
CREATE POLICY carts_select_own
ON public.carts FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS carts_insert_own ON public.carts;
CREATE POLICY carts_insert_own
ON public.carts FOR INSERT TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS carts_update_own ON public.carts;
CREATE POLICY carts_update_own
ON public.carts FOR UPDATE TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS carts_delete_own ON public.carts;
CREATE POLICY carts_delete_own
ON public.carts FOR DELETE TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS cart_items_select_own ON public.cart_items;
CREATE POLICY cart_items_select_own
ON public.cart_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND c.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS cart_items_insert_own ON public.cart_items;
CREATE POLICY cart_items_insert_own
ON public.cart_items FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND c.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS cart_items_update_own ON public.cart_items;
CREATE POLICY cart_items_update_own
ON public.cart_items FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND c.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND c.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS cart_items_delete_own ON public.cart_items;
CREATE POLICY cart_items_delete_own
ON public.cart_items FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND c.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS chat_live_rooms_select_authenticated ON public.chat_live_rooms;
CREATE POLICY chat_live_rooms_select_authenticated
ON public.chat_live_rooms FOR SELECT TO authenticated
USING (
  (status = 'live'::text)
  OR (host_user_id = (select auth.uid()))
);

DROP POLICY IF EXISTS chat_live_rooms_insert_host ON public.chat_live_rooms;
CREATE POLICY chat_live_rooms_insert_host
ON public.chat_live_rooms FOR INSERT TO authenticated
WITH CHECK (host_user_id = (select auth.uid()));

DROP POLICY IF EXISTS chat_live_rooms_update_host ON public.chat_live_rooms;
CREATE POLICY chat_live_rooms_update_host
ON public.chat_live_rooms FOR UPDATE TO authenticated
USING (host_user_id = (select auth.uid()))
WITH CHECK (host_user_id = (select auth.uid()));

DROP POLICY IF EXISTS chat_live_messages_select_authenticated ON public.chat_live_messages;
CREATE POLICY chat_live_messages_select_authenticated
ON public.chat_live_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_live_rooms r
    WHERE r.id = chat_live_messages.room_id
      AND (
        r.status = 'live'::text
        OR r.host_user_id = (select auth.uid())
      )
  )
);

DROP POLICY IF EXISTS chat_live_messages_insert_authenticated ON public.chat_live_messages;
CREATE POLICY chat_live_messages_insert_authenticated
ON public.chat_live_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.chat_live_rooms r
    WHERE r.id = chat_live_messages.room_id
      AND r.status = 'live'::text
  )
);

DROP POLICY IF EXISTS chat_live_messages_update_own ON public.chat_live_messages;
CREATE POLICY chat_live_messages_update_own
ON public.chat_live_messages FOR UPDATE TO authenticated
USING (sender_id = (select auth.uid()))
WITH CHECK (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS profile_verification_photos_admin_select ON public.profile_verification_photos;
DROP POLICY IF EXISTS profile_verification_photos_owner_select ON public.profile_verification_photos;

CREATE POLICY profile_verification_photos_select_authorized
ON public.profile_verification_photos FOR SELECT TO authenticated
USING (
  user_id = (select auth.uid())
  OR (select is_admin())
);

CREATE INDEX IF NOT EXISTS idx_marketing_conversion_events_ad_id
  ON public.marketing_conversion_events(ad_id);

CREATE INDEX IF NOT EXISTS idx_marketing_conversion_events_experiment_id
  ON public.marketing_conversion_events(experiment_id);

CREATE INDEX IF NOT EXISTS idx_marketing_conversion_events_variant_id
  ON public.marketing_conversion_events(variant_id);

CREATE INDEX IF NOT EXISTS idx_profile_verification_photos_reviewed_by
  ON public.profile_verification_photos(reviewed_by);
