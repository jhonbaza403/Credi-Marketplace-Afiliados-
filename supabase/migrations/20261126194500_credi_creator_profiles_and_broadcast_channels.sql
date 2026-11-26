BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

-- Creator identity is a product profile attached to the existing Credi identity.
CREATE TABLE IF NOT EXISTS public.creator_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  handle text NOT NULL UNIQUE
    CHECK (handle = lower(handle) AND handle ~ '^[a-z0-9][a-z0-9_]{2,29}$'),
  display_name text NOT NULL
    CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 100),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 1800),
  category text CHECK (category IS NULL OR char_length(btrim(category)) BETWEEN 2 AND 80),
  avatar_url text CHECK (avatar_url IS NULL OR avatar_url ~ '^https://'),
  cover_url text CHECK (cover_url IS NULL OR cover_url ~ '^https://'),
  website_url text CHECK (website_url IS NULL OR website_url ~ '^https://'),
  links jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(links) = 'object'),
  visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public','unlisted','private')),
  is_published boolean NOT NULL DEFAULT false,
  allow_followers boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creator_follows (
  creator_user_id uuid NOT NULL
    REFERENCES public.creator_profiles(user_id) ON DELETE CASCADE,
  follower_user_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (creator_user_id, follower_user_id),
  CONSTRAINT creator_follows_no_self CHECK (creator_user_id <> follower_user_id)
);
CREATE INDEX IF NOT EXISTS creator_follows_follower_idx
  ON public.creator_follows(follower_user_id, created_at DESC);

-- Broadcast channels share Credi identity, catalogue and product references.
CREATE TABLE IF NOT EXISTS public.broadcast_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  handle text NOT NULL UNIQUE
    CHECK (handle = lower(handle) AND handle ~ '^[a-z0-9][a-z0-9_-]{2,39}$'),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1200),
  avatar_url text CHECK (avatar_url IS NULL OR avatar_url ~ '^https://'),
  visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public','unlisted','private')),
  join_policy text NOT NULL DEFAULT 'open'
    CHECK (join_policy IN ('open','approval','invite_only')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT private_channel_requires_invite
    CHECK (visibility <> 'private' OR join_policy = 'invite_only')
);
CREATE INDEX IF NOT EXISTS broadcast_channels_public_created_idx
  ON public.broadcast_channels(created_at DESC)
  WHERE status = 'active' AND visibility = 'public';
CREATE INDEX IF NOT EXISTS broadcast_channels_owner_idx
  ON public.broadcast_channels(owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.broadcast_channel_members (
  channel_id uuid NOT NULL
    REFERENCES public.broadcast_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'subscriber'
    CHECK (role IN ('owner','admin','subscriber')),
  state text NOT NULL DEFAULT 'active'
    CHECK (state IN ('active','pending','muted','left')),
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);
CREATE INDEX IF NOT EXISTS broadcast_channel_members_user_idx
  ON public.broadcast_channel_members(user_id, state, created_at DESC);

CREATE TABLE IF NOT EXISTS public.broadcast_channel_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL
    REFERENCES public.broadcast_channels(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body_text text NOT NULL DEFAULT '' CHECK (char_length(body_text) <= 6000),
  media jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(media) = 'array' AND jsonb_array_length(media) <= 10),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','removed')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_channel_post_has_content
    CHECK (char_length(btrim(body_text)) > 0 OR jsonb_array_length(media) > 0),
  CONSTRAINT broadcast_channel_post_publish_time
    CHECK (status <> 'published' OR published_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS broadcast_channel_posts_feed_idx
  ON public.broadcast_channel_posts(channel_id, published_at DESC, id DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS broadcast_channel_posts_author_idx
  ON public.broadcast_channel_posts(author_id, created_at DESC);

-- Invite secrets are never stored in clear text and are not accessible to clients.
CREATE TABLE IF NOT EXISTS public.broadcast_channel_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL
    REFERENCES public.broadcast_channels(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE
    CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  invited_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_invite_terminal_state
    CHECK (NOT (accepted_at IS NOT NULL AND revoked_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS broadcast_channel_invites_channel_idx
  ON public.broadcast_channel_invites(channel_id, created_at DESC);

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_channel_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_channel_invites ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.creator_profiles, public.creator_follows,
  public.broadcast_channels, public.broadcast_channel_members,
  public.broadcast_channel_posts, public.broadcast_channel_invites
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.creator_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.creator_profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.creator_follows TO authenticated;
GRANT SELECT ON public.broadcast_channels TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.broadcast_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_channel_members TO authenticated;
GRANT SELECT ON public.broadcast_channel_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.broadcast_channel_posts TO authenticated;
REVOKE ALL ON public.broadcast_channel_invites FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.broadcast_channel_invites TO service_role;

CREATE OR REPLACE FUNCTION private.is_broadcast_channel_member(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.broadcast_channel_members AS m
    WHERE m.channel_id = p_channel_id
      AND m.user_id = (SELECT auth.uid())
      AND m.state = 'active'
  );
$function$;

CREATE OR REPLACE FUNCTION private.is_broadcast_channel_manager(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.broadcast_channels AS c
    WHERE c.id = p_channel_id
      AND c.owner_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1
    FROM public.broadcast_channel_members AS m
    WHERE m.channel_id = p_channel_id
      AND m.user_id = (SELECT auth.uid())
      AND m.role = 'admin'
      AND m.state = 'active'
  );
$function$;

CREATE OR REPLACE FUNCTION private.can_view_broadcast_channel(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.broadcast_channels AS c
    WHERE c.id = p_channel_id
      AND c.status = 'active'
      AND (
        c.visibility IN ('public','unlisted')
        OR c.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.broadcast_channel_members AS m
          WHERE m.channel_id = c.id
            AND m.user_id = (SELECT auth.uid())
            AND m.state = 'active'
        )
      )
  );
$function$;

REVOKE ALL ON FUNCTION private.is_broadcast_channel_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_broadcast_channel_manager(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_view_broadcast_channel(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_broadcast_channel_member(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_broadcast_channel_manager(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_broadcast_channel(uuid) TO anon, authenticated;

-- Creator profile visibility is controlled by publication and the profile owner.
DROP POLICY IF EXISTS creator_profiles_public_read ON public.creator_profiles;
CREATE POLICY creator_profiles_public_read
  ON public.creator_profiles FOR SELECT TO anon, authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (is_published = true AND visibility IN ('public','unlisted'))
  );
DROP POLICY IF EXISTS creator_profiles_owner_insert ON public.creator_profiles;
CREATE POLICY creator_profiles_owner_insert
  ON public.creator_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS creator_profiles_owner_update ON public.creator_profiles;
CREATE POLICY creator_profiles_owner_update
  ON public.creator_profiles FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS creator_follows_participant_read ON public.creator_follows;
CREATE POLICY creator_follows_participant_read
  ON public.creator_follows FOR SELECT TO authenticated
  USING (
    follower_user_id = (SELECT auth.uid())
    OR creator_user_id = (SELECT auth.uid())
  );
DROP POLICY IF EXISTS creator_follows_self_insert ON public.creator_follows;
CREATE POLICY creator_follows_self_insert
  ON public.creator_follows FOR INSERT TO authenticated
  WITH CHECK (
    follower_user_id = (SELECT auth.uid())
    AND creator_user_id <> (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.creator_profiles AS p
      WHERE p.user_id = creator_user_id
        AND p.is_published = true
        AND p.visibility = 'public'
        AND p.allow_followers = true
    )
  );
DROP POLICY IF EXISTS creator_follows_self_delete ON public.creator_follows;
CREATE POLICY creator_follows_self_delete
  ON public.creator_follows FOR DELETE TO authenticated
  USING (follower_user_id = (SELECT auth.uid()));

-- Channel visibility and membership policies.
DROP POLICY IF EXISTS broadcast_channels_visible_read ON public.broadcast_channels;
CREATE POLICY broadcast_channels_visible_read
  ON public.broadcast_channels FOR SELECT TO anon, authenticated
  USING (
    (status = 'active' AND visibility IN ('public','unlisted'))
    OR owner_id = (SELECT auth.uid())
    OR (SELECT private.is_broadcast_channel_member(id))
  );
DROP POLICY IF EXISTS broadcast_channels_owner_insert ON public.broadcast_channels;
CREATE POLICY broadcast_channels_owner_insert
  ON public.broadcast_channels FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS broadcast_channels_owner_update ON public.broadcast_channels;
CREATE POLICY broadcast_channels_owner_update
  ON public.broadcast_channels FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS broadcast_channels_owner_delete ON public.broadcast_channels;
CREATE POLICY broadcast_channels_owner_delete
  ON public.broadcast_channels FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS broadcast_channel_members_participant_read ON public.broadcast_channel_members;
CREATE POLICY broadcast_channel_members_participant_read
  ON public.broadcast_channel_members FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT private.is_broadcast_channel_manager(channel_id))
  );
DROP POLICY IF EXISTS broadcast_channel_members_owner_insert ON public.broadcast_channel_members;
CREATE POLICY broadcast_channel_members_owner_insert
  ON public.broadcast_channel_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND role = 'owner'
    AND state = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.broadcast_channels AS c
      WHERE c.id = channel_id
        AND c.owner_id = (SELECT auth.uid())
    )
  );
DROP POLICY IF EXISTS broadcast_channel_members_subscribe_insert ON public.broadcast_channel_members;
CREATE POLICY broadcast_channel_members_subscribe_insert
  ON public.broadcast_channel_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND role = 'subscriber'
    AND (
      (
        state = 'active'
        AND EXISTS (
          SELECT 1
          FROM public.broadcast_channels AS c
          WHERE c.id = channel_id
            AND c.status = 'active'
            AND c.visibility IN ('public','unlisted')
            AND c.join_policy = 'open'
        )
      )
      OR (
        state = 'pending'
        AND EXISTS (
          SELECT 1
          FROM public.broadcast_channels AS c
          WHERE c.id = channel_id
            AND c.status = 'active'
            AND c.visibility IN ('public','unlisted')
            AND c.join_policy = 'approval'
        )
      )
    )
  );

-- Subscribers can leave by DELETE. They cannot promote their own pending membership.
DROP POLICY IF EXISTS broadcast_channel_members_self_update ON public.broadcast_channel_members;
DROP POLICY IF EXISTS broadcast_channel_members_manager_update ON public.broadcast_channel_members;
CREATE POLICY broadcast_channel_members_manager_update
  ON public.broadcast_channel_members FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_broadcast_channel_manager(channel_id))
    AND role = 'subscriber'
  )
  WITH CHECK (
    (SELECT private.is_broadcast_channel_manager(channel_id))
    AND role = 'subscriber'
    AND state IN ('active','pending','muted','left')
  );
DROP POLICY IF EXISTS broadcast_channel_members_self_delete ON public.broadcast_channel_members;
CREATE POLICY broadcast_channel_members_self_delete
  ON public.broadcast_channel_members FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND role = 'subscriber'
  );
DROP POLICY IF EXISTS broadcast_channel_members_manager_delete ON public.broadcast_channel_members;
CREATE POLICY broadcast_channel_members_manager_delete
  ON public.broadcast_channel_members FOR DELETE TO authenticated
  USING (
    (SELECT private.is_broadcast_channel_manager(channel_id))
    AND role = 'subscriber'
  );

DROP POLICY IF EXISTS broadcast_channel_posts_visible_read ON public.broadcast_channel_posts;
CREATE POLICY broadcast_channel_posts_visible_read
  ON public.broadcast_channel_posts FOR SELECT TO anon, authenticated
  USING (
    (status = 'published' AND (SELECT private.can_view_broadcast_channel(channel_id)))
    OR (SELECT private.is_broadcast_channel_manager(channel_id))
  );
DROP POLICY IF EXISTS broadcast_channel_posts_manager_insert ON public.broadcast_channel_posts;
CREATE POLICY broadcast_channel_posts_manager_insert
  ON public.broadcast_channel_posts FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (SELECT private.is_broadcast_channel_manager(channel_id))
    AND (
      product_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.products AS p
        WHERE p.id = product_id
          AND p.is_active = true
      )
    )
  );
DROP POLICY IF EXISTS broadcast_channel_posts_author_update ON public.broadcast_channel_posts;
CREATE POLICY broadcast_channel_posts_author_update
  ON public.broadcast_channel_posts FOR UPDATE TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    AND (SELECT private.is_broadcast_channel_manager(channel_id))
  )
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (SELECT private.is_broadcast_channel_manager(channel_id))
  );
DROP POLICY IF EXISTS broadcast_channel_posts_author_delete ON public.broadcast_channel_posts;
CREATE POLICY broadcast_channel_posts_author_delete
  ON public.broadcast_channel_posts FOR DELETE TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR (SELECT private.is_broadcast_channel_manager(channel_id))
  );

-- Channel plus owner membership is created atomically.
CREATE OR REPLACE FUNCTION public.create_broadcast_channel(
  p_handle text,
  p_title text,
  p_description text DEFAULT '',
  p_visibility text DEFAULT 'public',
  p_join_policy text DEFAULT 'open'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_owner uuid := (SELECT auth.uid());
  v_channel_id uuid;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;
  IF p_handle IS NULL OR lower(btrim(p_handle)) !~ '^[a-z0-9][a-z0-9_-]{2,39}$' THEN
    RAISE EXCEPTION 'INVALID_CHANNEL_HANDLE' USING ERRCODE = '22023';
  END IF;
  IF p_title IS NULL OR char_length(btrim(p_title)) NOT BETWEEN 3 AND 120 THEN
    RAISE EXCEPTION 'INVALID_CHANNEL_TITLE' USING ERRCODE = '22023';
  END IF;
  IF coalesce(char_length(p_description),0) > 1200 THEN
    RAISE EXCEPTION 'INVALID_CHANNEL_DESCRIPTION' USING ERRCODE = '22023';
  END IF;
  IF p_visibility NOT IN ('public','unlisted','private')
     OR p_join_policy NOT IN ('open','approval','invite_only')
     OR (p_visibility = 'private' AND p_join_policy <> 'invite_only') THEN
    RAISE EXCEPTION 'INVALID_CHANNEL_ACCESS_POLICY' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.broadcast_channels(
    owner_id, handle, title, description, visibility, join_policy
  ) VALUES (
    v_owner, lower(btrim(p_handle)), btrim(p_title),
    coalesce(btrim(p_description), ''), p_visibility, p_join_policy
  )
  RETURNING id INTO v_channel_id;

  INSERT INTO public.broadcast_channel_members(
    channel_id, user_id, role, state, joined_at
  ) VALUES (
    v_channel_id, v_owner, 'owner', 'active', now()
  );

  RETURN v_channel_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_broadcast_channel(text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_broadcast_channel(text,text,text,text,text) TO authenticated;

-- Token acceptance is atomic: validate, create/reactivate membership, consume invite.
CREATE OR REPLACE FUNCTION private.accept_broadcast_channel_invite(p_token_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_invite public.broadcast_channel_invites%ROWTYPE;
  v_channel public.broadcast_channels%ROWTYPE;
  v_existing_role text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;
  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'INVALID_INVITE' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.broadcast_channel_invites AS i
  WHERE i.token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND
     OR v_invite.accepted_at IS NOT NULL
     OR v_invite.revoked_at IS NOT NULL
     OR v_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'INVITE_EXPIRED_OR_USED' USING ERRCODE = 'P0002';
  END IF;
  IF v_invite.invited_user_id IS NOT NULL
     AND v_invite.invited_user_id <> v_user_id THEN
    RAISE EXCEPTION 'INVITE_NOT_FOR_THIS_USER' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_channel
  FROM public.broadcast_channels AS c
  WHERE c.id = v_invite.channel_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_channel.status <> 'active'
     OR v_channel.visibility <> 'private'
     OR v_channel.join_policy <> 'invite_only' THEN
    RAISE EXCEPTION 'CHANNEL_NOT_INVITE_ACCESSIBLE' USING ERRCODE = '42501';
  END IF;

  SELECT m.role
  INTO v_existing_role
  FROM public.broadcast_channel_members AS m
  WHERE m.channel_id = v_channel.id
    AND m.user_id = v_user_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_role <> 'subscriber' THEN
      RAISE EXCEPTION 'CHANNEL_MEMBERSHIP_PROTECTED' USING ERRCODE = '42501';
    END IF;
    UPDATE public.broadcast_channel_members
    SET state = 'active',
        joined_at = coalesce(joined_at, now()),
        updated_at = now()
    WHERE channel_id = v_channel.id
      AND user_id = v_user_id;
  ELSE
    INSERT INTO public.broadcast_channel_members(
      channel_id, user_id, role, state, joined_at
    ) VALUES (
      v_channel.id, v_user_id, 'subscriber', 'active', now()
    );
  END IF;

  UPDATE public.broadcast_channel_invites
  SET accepted_at = now()
  WHERE id = v_invite.id
    AND accepted_at IS NULL
    AND revoked_at IS NULL;

  RETURN v_channel.id;
END;
$function$;
REVOKE ALL ON FUNCTION private.accept_broadcast_channel_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.accept_broadcast_channel_invite(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_broadcast_channel_invite(p_token_hash text)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.accept_broadcast_channel_invite(p_token_hash);
$function$;
REVOKE ALL ON FUNCTION public.accept_broadcast_channel_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_broadcast_channel_invite(text) TO authenticated;

-- Internal timestamp trigger; execution is only via triggers.
CREATE OR REPLACE FUNCTION private.touch_creator_channel_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.touch_creator_channel_updated_at() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS creator_profiles_updated_at ON public.creator_profiles;
CREATE TRIGGER creator_profiles_updated_at
  BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION private.touch_creator_channel_updated_at();

DROP TRIGGER IF EXISTS broadcast_channels_updated_at ON public.broadcast_channels;
CREATE TRIGGER broadcast_channels_updated_at
  BEFORE UPDATE ON public.broadcast_channels
  FOR EACH ROW EXECUTE FUNCTION private.touch_creator_channel_updated_at();

DROP TRIGGER IF EXISTS broadcast_channel_members_updated_at ON public.broadcast_channel_members;
CREATE TRIGGER broadcast_channel_members_updated_at
  BEFORE UPDATE ON public.broadcast_channel_members
  FOR EACH ROW EXECUTE FUNCTION private.touch_creator_channel_updated_at();

DROP TRIGGER IF EXISTS broadcast_channel_posts_updated_at ON public.broadcast_channel_posts;
CREATE TRIGGER broadcast_channel_posts_updated_at
  BEFORE UPDATE ON public.broadcast_channel_posts
  FOR EACH ROW EXECUTE FUNCTION private.touch_creator_channel_updated_at();

DO $publication$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'broadcast_channel_posts'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_channel_posts;
  END IF;
END;
$publication$;

COMMIT;
