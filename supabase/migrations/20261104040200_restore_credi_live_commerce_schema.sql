-- Align isolated Preview with the inspected Credi LIVE schema and secure ownership rules.
-- This migration is additive: existing rooms/messages are preserved.

ALTER TABLE public.chat_live_rooms
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_media jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS replay_url text,
  ADD COLUMN IF NOT EXISTS playback_url text,
  ADD COLUMN IF NOT EXISTS stream_provider text NOT NULL DEFAULT 'external',
  ADD COLUMN IF NOT EXISTS viewer_peak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes_count bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares_count bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT
    '{"q_and_a":true,"comments":true,"reactions":true,"moderation":true,"guest_stage":true,"record_replay":true,"product_pinning":true}'::jsonb;

ALTER TABLE public.chat_live_rooms
  DROP CONSTRAINT IF EXISTS chat_live_rooms_status_check;
ALTER TABLE public.chat_live_rooms
  ADD CONSTRAINT chat_live_rooms_status_check
  CHECK (status IN ('scheduled','live','ended','cancelled'));
ALTER TABLE public.chat_live_rooms
  DROP CONSTRAINT IF EXISTS chat_live_rooms_viewer_peak_check;
ALTER TABLE public.chat_live_rooms
  ADD CONSTRAINT chat_live_rooms_viewer_peak_check CHECK (viewer_peak >= 0);
ALTER TABLE public.chat_live_rooms
  DROP CONSTRAINT IF EXISTS chat_live_rooms_likes_count_check;
ALTER TABLE public.chat_live_rooms
  ADD CONSTRAINT chat_live_rooms_likes_count_check CHECK (likes_count >= 0);
ALTER TABLE public.chat_live_rooms
  DROP CONSTRAINT IF EXISTS chat_live_rooms_shares_count_check;
ALTER TABLE public.chat_live_rooms
  ADD CONSTRAINT chat_live_rooms_shares_count_check CHECK (shares_count >= 0);

ALTER TABLE public.chat_live_messages
  DROP CONSTRAINT IF EXISTS chat_live_messages_body_check;
ALTER TABLE public.chat_live_messages
  ADD CONSTRAINT chat_live_messages_body_check
  CHECK (char_length(btrim(body)) BETWEEN 1 AND 500);

CREATE TABLE IF NOT EXISTS public.chat_live_products (
  room_id uuid NOT NULL REFERENCES public.chat_live_rooms(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  is_pinned boolean NOT NULL DEFAULT false,
  pinned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, product_id)
);
CREATE INDEX IF NOT EXISTS chat_live_products_product_idx
  ON public.chat_live_products(product_id);
CREATE INDEX IF NOT EXISTS chat_live_products_room_idx
  ON public.chat_live_products(room_id, position);

CREATE TABLE IF NOT EXISTS public.chat_live_giveaways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_live_rooms(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 160),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','drawn','cancelled')),
  config jsonb NOT NULL DEFAULT '{"entries":"active_viewers"}'::jsonb,
  winner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  drawn_at timestamptz
);
CREATE INDEX IF NOT EXISTS chat_live_giveaways_room_idx
  ON public.chat_live_giveaways(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_live_giveaways_winner_idx
  ON public.chat_live_giveaways(winner_user_id);

CREATE TABLE IF NOT EXISTS public.chat_live_moderators (
  room_id uuid NOT NULL REFERENCES public.chat_live_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permissions jsonb NOT NULL DEFAULT
    '{"mute_user":true,"block_user":true,"delete_comment":true,"manage_products":true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS chat_live_moderators_room_idx
  ON public.chat_live_moderators(room_id);
CREATE INDEX IF NOT EXISTS chat_live_moderators_user_idx
  ON public.chat_live_moderators(user_id);

CREATE TABLE IF NOT EXISTS public.chat_live_blocked_keywords (
  room_id uuid NOT NULL REFERENCES public.chat_live_rooms(id) ON DELETE CASCADE,
  keyword text NOT NULL CHECK (char_length(btrim(keyword)) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, keyword)
);
CREATE INDEX IF NOT EXISTS idx_chat_live_blocked_keywords_room
  ON public.chat_live_blocked_keywords(room_id);

CREATE TABLE IF NOT EXISTS public.chat_live_reactions (
  room_id uuid NOT NULL REFERENCES public.chat_live_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (char_length(reaction) BETWEEN 1 AND 32),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id, reaction)
);
CREATE INDEX IF NOT EXISTS chat_live_reactions_room_idx
  ON public.chat_live_reactions(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_live_reactions_user_idx
  ON public.chat_live_reactions(user_id);

ALTER TABLE public.chat_live_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_live_giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_live_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_live_blocked_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_live_reactions ENABLE ROW LEVEL SECURITY;

-- No anonymous direct access to LIVE control tables.
REVOKE ALL ON TABLE
  public.chat_live_products,
  public.chat_live_giveaways,
  public.chat_live_moderators,
  public.chat_live_blocked_keywords,
  public.chat_live_reactions
FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.chat_live_products,
  public.chat_live_giveaways,
  public.chat_live_moderators,
  public.chat_live_blocked_keywords,
  public.chat_live_reactions
TO authenticated;

DROP POLICY IF EXISTS chat_live_products_member_select ON public.chat_live_products;
CREATE POLICY chat_live_products_member_select ON public.chat_live_products
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_live_rooms r
    WHERE r.id = room_id
      AND (r.status = 'live' OR r.host_user_id = (SELECT auth.uid()))
  ));
DROP POLICY IF EXISTS chat_live_products_host_write ON public.chat_live_products;
CREATE POLICY chat_live_products_host_write ON public.chat_live_products
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_live_rooms r
      WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = product_id
        AND p.is_active = true
        AND p.stock > 0
        AND s.vendor_id = (SELECT auth.uid())
        AND s.is_active = true
    )
  );
DROP POLICY IF EXISTS chat_live_products_host_update_delete ON public.chat_live_products;
CREATE POLICY chat_live_products_host_update_delete ON public.chat_live_products
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_live_rooms r
    WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
  ))
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_live_rooms r
      WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = product_id
        AND p.is_active = true
        AND p.stock > 0
        AND s.vendor_id = (SELECT auth.uid())
        AND s.is_active = true
    )
  );
DROP POLICY IF EXISTS chat_live_products_host_delete ON public.chat_live_products;
CREATE POLICY chat_live_products_host_delete ON public.chat_live_products
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_live_rooms r
    WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS chat_live_giveaways_host_manage ON public.chat_live_giveaways;
CREATE POLICY chat_live_giveaways_host_manage ON public.chat_live_giveaways
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_live_rooms r
    WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_live_rooms r
    WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS chat_live_moderators_host_manage ON public.chat_live_moderators;
CREATE POLICY chat_live_moderators_host_manage ON public.chat_live_moderators
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_live_rooms r
    WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_live_rooms r
    WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS chat_live_blocked_keywords_host_manage ON public.chat_live_blocked_keywords;
CREATE POLICY chat_live_blocked_keywords_host_manage ON public.chat_live_blocked_keywords
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_live_rooms r
    WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_live_rooms r
    WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS chat_live_reactions_live_member ON public.chat_live_reactions;
CREATE POLICY chat_live_reactions_live_member ON public.chat_live_reactions
  FOR ALL TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.chat_live_rooms r
      WHERE r.id = room_id AND r.status = 'live'
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.chat_live_rooms r
      WHERE r.id = room_id AND r.status = 'live'
    )
  );
DROP POLICY IF EXISTS chat_live_reactions_select_live ON public.chat_live_reactions;
CREATE POLICY chat_live_reactions_select_live ON public.chat_live_reactions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_live_rooms r
    WHERE r.id = room_id AND r.status = 'live'
  ));

DROP POLICY IF EXISTS chat_live_messages_delete_host_moderator ON public.chat_live_messages;
CREATE POLICY chat_live_messages_delete_host_moderator ON public.chat_live_messages
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_live_rooms r
      WHERE r.id = room_id
        AND (
          r.host_user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.chat_live_moderators m
            WHERE m.room_id = r.id
              AND m.user_id = (SELECT auth.uid())
              AND coalesce((m.permissions->>'delete_comment')::boolean,false)
          )
        )
    )
  );

DO $publication$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_live_products') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_live_products;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_live_reactions') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_live_reactions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_live_messages') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_live_messages;
    END IF;
  END IF;
END
$publication$;
