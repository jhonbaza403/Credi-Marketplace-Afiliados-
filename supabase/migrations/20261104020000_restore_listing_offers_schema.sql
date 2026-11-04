-- Restore the canonical listing_offers schema recovered from the
-- production PostgreSQL catalogs. The former source migration contained only
-- RLS policies; it never created the table in a clean local reset.
BEGIN;

CREATE TABLE IF NOT EXISTS public.listing_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  title text NOT NULL,
  offer_price numeric(20,4) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'USD',
  original_price numeric(20,4),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  max_quantity numeric(20,4),
  terms text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_offers_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE,
  CONSTRAINT listing_offers_seller_id_fkey
    FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT listing_offers_currency_valid
    CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT listing_offers_dates_valid
    CHECK (ends_at > starts_at),
  CONSTRAINT listing_offers_original_price_valid
    CHECK (original_price IS NULL OR original_price >= offer_price),
  CONSTRAINT listing_offers_price_valid
    CHECK (offer_price >= 0),
  CONSTRAINT listing_offers_quantity_valid
    CHECK (max_quantity IS NULL OR max_quantity > 0),
  CONSTRAINT listing_offers_status_valid
    CHECK (status IN ('scheduled', 'active', 'paused', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_listing_offers_active
  ON public.listing_offers(status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_listing_offers_listing
  ON public.listing_offers(listing_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_offers_seller
  ON public.listing_offers(seller_id);

CREATE OR REPLACE FUNCTION public.set_listing_offers_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listing_offers_updated_at ON public.listing_offers;
CREATE TRIGGER trg_listing_offers_updated_at
BEFORE UPDATE ON public.listing_offers
FOR EACH ROW EXECUTE FUNCTION public.set_listing_offers_updated_at();

ALTER TABLE public.listing_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listing_offers_owner_all ON public.listing_offers;
DROP POLICY IF EXISTS listing_offers_public_read ON public.listing_offers;
DROP POLICY IF EXISTS listing_offers_select_visible ON public.listing_offers;
CREATE POLICY listing_offers_select_visible
ON public.listing_offers FOR SELECT TO anon, authenticated
USING (
  (status = 'active' AND starts_at <= now() AND ends_at > now())
  OR (
    (SELECT auth.uid()) IS NOT NULL
    AND (seller_id = (SELECT auth.uid()) OR (SELECT is_admin()))
  )
);

DROP POLICY IF EXISTS listing_offers_owner_insert ON public.listing_offers;
CREATE POLICY listing_offers_owner_insert
ON public.listing_offers FOR INSERT TO authenticated
WITH CHECK (seller_id = (SELECT auth.uid()) OR (SELECT is_admin()));

DROP POLICY IF EXISTS listing_offers_owner_update ON public.listing_offers;
CREATE POLICY listing_offers_owner_update
ON public.listing_offers FOR UPDATE TO authenticated
USING (seller_id = (SELECT auth.uid()) OR (SELECT is_admin()))
WITH CHECK (seller_id = (SELECT auth.uid()) OR (SELECT is_admin()));

DROP POLICY IF EXISTS listing_offers_owner_delete ON public.listing_offers;
CREATE POLICY listing_offers_owner_delete
ON public.listing_offers FOR DELETE TO authenticated
USING (seller_id = (SELECT auth.uid()) OR (SELECT is_admin()));

REVOKE ALL PRIVILEGES ON TABLE public.listing_offers FROM anon;
GRANT SELECT ON TABLE public.listing_offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.listing_offers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.listing_offers TO service_role;

COMMIT;
