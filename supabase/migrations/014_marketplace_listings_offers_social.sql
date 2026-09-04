-- ============================================================
-- Credi Marketplace
-- MIGRATION 014: listings, offers and social publishing foundation
-- ============================================================
-- Migration 010 is responsible for adding order_status.expired.
-- Keeping that enum change isolated avoids same-transaction enum
-- visibility problems on PostgreSQL versions that enforce them.
-- External social APIs still require each platform's OAuth/app approval.
-- Secrets/tokens are never hard-coded in the repository.

BEGIN;

-- ------------------------------------------------------------
-- 1. Marketplace listings: one flexible model for goods/services.
-- ------------------------------------------------------------
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
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT listings_type_valid CHECK (listing_type IN ('product', 'service', 'property', 'vehicle', 'classified')),
    CONSTRAINT listings_status_valid CHECK (status IN ('draft', 'pending_review', 'published', 'paused', 'sold', 'expired', 'rejected', 'archived')),
    CONSTRAINT listings_condition_valid CHECK (condition IN ('new', 'used', 'refurbished', 'open_box', 'not_applicable')),
    CONSTRAINT listings_currency_valid CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT listings_quantity_valid CHECK (quantity > 0),
    CONSTRAINT listings_price_valid CHECK (price_amount IS NULL OR price_amount >= 0),
    CONSTRAINT listings_dates_valid CHECK (expires_at IS NULL OR published_at IS NULL OR expires_at > published_at)
);

CREATE INDEX IF NOT EXISTS idx_listings_seller_status
ON public.listings(seller_id, status);

CREATE INDEX IF NOT EXISTS idx_listings_category_status
ON public.listings(category_slug, status);

CREATE INDEX IF NOT EXISTS idx_listings_published_at
ON public.listings(published_at DESC)
WHERE status = 'published';

CREATE OR REPLACE FUNCTION public.set_listings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
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

-- ------------------------------------------------------------
-- 2. Offers: separate from advertising/sponsored placement.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
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
    CONSTRAINT listing_offers_status_valid CHECK (status IN ('scheduled', 'active', 'paused', 'expired', 'cancelled')),
    CONSTRAINT listing_offers_currency_valid CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT listing_offers_price_valid CHECK (offer_price >= 0),
    CONSTRAINT listing_offers_original_price_valid CHECK (original_price IS NULL OR original_price >= offer_price),
    CONSTRAINT listing_offers_dates_valid CHECK (ends_at > starts_at),
    CONSTRAINT listing_offers_quantity_valid CHECK (max_quantity IS NULL OR max_quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_listing_offers_active
ON public.listing_offers(status, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_listing_offers_listing
ON public.listing_offers(listing_id, starts_at DESC);

CREATE OR REPLACE FUNCTION public.set_listing_offers_updated_at()
RETURNS trigger
LANGUAGE plpgsql
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

-- ------------------------------------------------------------
-- 3. Social accounts and publishing queue.
-- credential_ciphertext must contain application-encrypted data.
-- Never store plaintext OAuth tokens.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider text NOT NULL,
    provider_account_id text NOT NULL,
    account_name text,
    credential_ciphertext text,
    credential_expires_at timestamptz,
    scopes text[] NOT NULL DEFAULT '{}',
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT social_accounts_provider_valid CHECK (
        provider IN ('tiktok', 'tiktok_shop', 'youtube', 'instagram', 'facebook', 'threads', 'pinterest', 'linkedin')
    ),
    CONSTRAINT social_accounts_status_valid CHECK (status IN ('active', 'expired', 'revoked', 'disconnected', 'error')),
    UNIQUE(owner_id, provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_owner
ON public.social_accounts(owner_id, provider, status);

CREATE TABLE IF NOT EXISTS public.social_publications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
    social_account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
    provider text NOT NULL,
    status text NOT NULL DEFAULT 'queued',
    title text,
    caption text,
    media jsonb NOT NULL DEFAULT '[]'::jsonb,
    publish_at timestamptz,
    provider_post_id text,
    provider_post_url text,
    last_error text,
    attempts integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT social_publications_provider_valid CHECK (
        provider IN ('tiktok', 'tiktok_shop', 'youtube', 'instagram', 'facebook', 'threads', 'pinterest', 'linkedin')
    ),
    CONSTRAINT social_publications_status_valid CHECK (
        status IN ('queued', 'processing', 'published', 'partial', 'failed', 'cancelled')
    ),
    CONSTRAINT social_publications_attempts_valid CHECK (attempts >= 0)
);

CREATE INDEX IF NOT EXISTS idx_social_publications_owner_status
ON public.social_publications(owner_id, status, publish_at);

CREATE INDEX IF NOT EXISTS idx_social_publications_queue
ON public.social_publications(status, publish_at)
WHERE status IN ('queued', 'processing');

CREATE UNIQUE INDEX IF NOT EXISTS ux_social_publications_provider_post
ON public.social_publications(provider, provider_post_id)
WHERE provider_post_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_social_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_social_accounts_updated_at ON public.social_accounts;
CREATE TRIGGER trg_social_accounts_updated_at
BEFORE UPDATE ON public.social_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_social_updated_at();

DROP TRIGGER IF EXISTS trg_social_publications_updated_at ON public.social_publications;
CREATE TRIGGER trg_social_publications_updated_at
BEFORE UPDATE ON public.social_publications
FOR EACH ROW EXECUTE FUNCTION public.set_social_updated_at();

-- ------------------------------------------------------------
-- 4. RLS: users manage only their own listings/offers/social data.
-- Public marketplace reads only published listings and active offers.
-- ------------------------------------------------------------
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_publications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listings_public_read ON public.listings;
CREATE POLICY listings_public_read
ON public.listings FOR SELECT
USING (status = 'published');

DROP POLICY IF EXISTS listings_owner_all ON public.listings;
CREATE POLICY listings_owner_all
ON public.listings FOR ALL
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS listing_offers_public_read ON public.listing_offers;
CREATE POLICY listing_offers_public_read
ON public.listing_offers FOR SELECT
USING (
    status = 'active'
    AND starts_at <= now()
    AND ends_at > now()
);

DROP POLICY IF EXISTS listing_offers_owner_all ON public.listing_offers;
CREATE POLICY listing_offers_owner_all
ON public.listing_offers FOR ALL
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS social_accounts_owner_all ON public.social_accounts;
CREATE POLICY social_accounts_owner_all
ON public.social_accounts FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS social_publications_owner_all ON public.social_publications;
CREATE POLICY social_publications_owner_all
ON public.social_publications FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

COMMIT;
