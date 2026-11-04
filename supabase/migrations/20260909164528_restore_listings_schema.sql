-- Restore the canonical listings relation before the historical affiliate/compliance
-- migration that extends it. This migration is intentionally idempotent:
-- production already has this relation, while clean local resets did not.
-- IMPORTANT: production already has this schema. Reconcile this historical
-- missing version in remote migration history before any production db push.
BEGIN;

CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  listing_type text NOT NULL DEFAULT 'product',
  status text NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  description text NOT NULL,
  category_slug text NOT NULL,
  subcategory_slug text,
  condition text NOT NULL DEFAULT 'new',
  price_amount numeric(20,4),
  currency char(3) NOT NULL DEFAULT 'USD',
  quantity numeric(20,4) NOT NULL DEFAULT 1,
  location_country char(2),
  location_region text,
  location_city text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  shipping_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  service_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  expires_at timestamptz,
  video_media jsonb NOT NULL DEFAULT '[]'::jsonb,
  compliance_country char(2),
  moderation_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listings_condition_valid
    CHECK (condition IN ('new','used','refurbished','open_box','not_applicable')),
  CONSTRAINT listings_currency_valid
    CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT listings_dates_valid
    CHECK (expires_at IS NULL OR published_at IS NULL OR expires_at > published_at),
  CONSTRAINT listings_price_valid
    CHECK (price_amount IS NULL OR price_amount >= 0),
  CONSTRAINT listings_quantity_valid
    CHECK (quantity > 0),
  CONSTRAINT listings_status_valid
    CHECK (status IN ('draft','pending_review','published','paused','sold','expired','rejected','archived')),
  CONSTRAINT listings_type_valid
    CHECK (listing_type IN ('product','service','property','vehicle','classified')),
  CONSTRAINT listings_moderation_status_check
    CHECK (moderation_status IN ('pending','approved','rejected','blocked'))
);

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS video_media jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS compliance_country char(2),
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending','approved','rejected','blocked'));

CREATE INDEX IF NOT EXISTS idx_listings_category_status
  ON public.listings(category_slug, status);
CREATE INDEX IF NOT EXISTS idx_listings_published_at
  ON public.listings(published_at DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_listings_seller_status
  ON public.listings(seller_id, status);

CREATE OR REPLACE FUNCTION public.set_listings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_updated_at ON public.listings;
CREATE TRIGGER trg_listings_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.set_listings_updated_at();

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listings_select_visible_or_own ON public.listings;
CREATE POLICY listings_select_visible_or_own
ON public.listings FOR SELECT TO anon, authenticated
USING (
  (status = 'published' AND moderation_status = 'approved')
  OR seller_id = (SELECT auth.uid())
  OR (SELECT is_admin())
);

DROP POLICY IF EXISTS listings_owner_insert ON public.listings;
CREATE POLICY listings_owner_insert
ON public.listings FOR INSERT TO authenticated
WITH CHECK (seller_id = (SELECT auth.uid()) OR (SELECT is_admin()));

DROP POLICY IF EXISTS listings_owner_update ON public.listings;
CREATE POLICY listings_owner_update
ON public.listings FOR UPDATE TO authenticated
USING (seller_id = (SELECT auth.uid()) OR (SELECT is_admin()))
WITH CHECK (seller_id = (SELECT auth.uid()) OR (SELECT is_admin()));

DROP POLICY IF EXISTS listings_owner_delete ON public.listings;
CREATE POLICY listings_owner_delete
ON public.listings FOR DELETE TO authenticated
USING (seller_id = (SELECT auth.uid()) OR (SELECT is_admin()));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.listings TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.listings TO service_role;

COMMIT;
