-- Credi Marketplace: contenido social nativo por cuenta.
-- Ya aplicado en Supabase; este archivo mantiene Git sincronizado.

BEGIN;

CREATE TABLE IF NOT EXISTS public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  body text NOT NULL,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  destination_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  budget_amount numeric(20,2) CHECK (budget_amount IS NULL OR budget_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_posts_owner_created ON public.feed_posts(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_public ON public.feed_posts(status, visibility, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_owner_expires ON public.stories(owner_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_public_expires ON public.stories(visibility, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_owner_created ON public.reels(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_public ON public.reels(status, visibility, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_ads_owner_created ON public.advertisements(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ads_active_window ON public.advertisements(status, starts_at, ends_at);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feed_posts_select_public_or_own ON public.feed_posts;
CREATE POLICY feed_posts_select_public_or_own ON public.feed_posts FOR SELECT TO anon, authenticated USING ((status = 'published' AND visibility = 'public') OR owner_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
DROP POLICY IF EXISTS feed_posts_owner_write ON public.feed_posts;
CREATE POLICY feed_posts_owner_write ON public.feed_posts FOR ALL TO authenticated USING (owner_id = (SELECT auth.uid()) OR (SELECT public.is_admin())) WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS stories_select_public_or_own ON public.stories;
CREATE POLICY stories_select_public_or_own ON public.stories FOR SELECT TO anon, authenticated USING (((visibility = 'public') AND expires_at > now()) OR owner_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
DROP POLICY IF EXISTS stories_owner_write ON public.stories;
CREATE POLICY stories_owner_write ON public.stories FOR ALL TO authenticated USING (owner_id = (SELECT auth.uid()) OR (SELECT public.is_admin())) WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS reels_select_public_or_own ON public.reels;
CREATE POLICY reels_select_public_or_own ON public.reels FOR SELECT TO anon, authenticated USING ((status = 'published' AND visibility = 'public') OR owner_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
DROP POLICY IF EXISTS reels_owner_write ON public.reels;
CREATE POLICY reels_owner_write ON public.reels FOR ALL TO authenticated USING (owner_id = (SELECT auth.uid()) OR (SELECT public.is_admin())) WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS advertisements_select_active_or_own ON public.advertisements;
CREATE POLICY advertisements_select_active_or_own ON public.advertisements FOR SELECT TO anon, authenticated USING ((status = 'active' AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now())) OR owner_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
DROP POLICY IF EXISTS advertisements_owner_write ON public.advertisements;
CREATE POLICY advertisements_owner_write ON public.advertisements FOR ALL TO authenticated USING (owner_id = (SELECT auth.uid()) OR (SELECT public.is_admin())) WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

COMMIT;
