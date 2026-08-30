-- ============================================================
-- Credi Marketplace
-- MIGRATION 002: Core Schema
-- ============================================================

BEGIN;

-- ============================================================
-- ENUMS
-- ============================================================

DO $$
BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'customer',
        'vendor',
        'professional',
        'company',
        'admin'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- ============================================================
-- PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,

    role public.user_role NOT NULL DEFAULT 'customer',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT profiles_email_length
        CHECK (email IS NULL OR char_length(email) <= 320),

    CONSTRAINT profiles_full_name_length
        CHECK (full_name IS NULL OR char_length(full_name) <= 200)
);

-- ============================================================
-- STORES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    vendor_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    store_name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,

    logo_url TEXT,
    banner_url TEXT,

    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT stores_name_length
        CHECK (char_length(trim(store_name)) BETWEEN 2 AND 200),

    CONSTRAINT stores_slug_format
        CHECK (
            slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        )
);

-- ============================================================
-- CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    parent_id UUID
        REFERENCES public.categories(id)
        ON DELETE SET NULL,

    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,

    image_url TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT categories_name_length
        CHECK (char_length(trim(name)) BETWEEN 2 AND 150),

    CONSTRAINT categories_slug_format
        CHECK (
            slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        )
);

-- ============================================================
-- PRODUCTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    store_id UUID NOT NULL
        REFERENCES public.stores(id)
        ON DELETE RESTRICT,

    category_id UUID
        REFERENCES public.categories(id)
        ON DELETE SET NULL,

    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,

    price NUMERIC(19,4) NOT NULL,

    stock INTEGER NOT NULL DEFAULT 0,

    image_url TEXT,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT products_title_length
        CHECK (char_length(trim(title)) BETWEEN 2 AND 300),

    CONSTRAINT products_slug_format
        CHECK (
            slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        ),

    CONSTRAINT products_price_non_negative
        CHECK (price >= 0),

    CONSTRAINT products_stock_non_negative
        CHECK (stock >= 0),

    CONSTRAINT products_images_array
        CHECK (jsonb_typeof(images) = 'array')
);

-- ============================================================
-- AFFILIATES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    code TEXT NOT NULL,

    name TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    commission_rate NUMERIC(7,4) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT affiliates_code_format
        CHECK (
            code ~ '^[A-Za-z0-9_-]{3,128}$'
        ),

    CONSTRAINT affiliates_commission_rate
        CHECK (
            commission_rate >= 0
            AND commission_rate <= 100
        )
);

-- ============================================================
-- AFFILIATE PRODUCT RELATION
-- ============================================================

CREATE TABLE IF NOT EXISTS public.affiliate_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    affiliate_id UUID NOT NULL
        REFERENCES public.affiliates(id)
        ON DELETE CASCADE,

    product_id UUID NOT NULL
        REFERENCES public.products(id)
        ON DELETE CASCADE,

    affiliate_url TEXT NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT affiliate_products_url_length
        CHECK (char_length(affiliate_url) <= 2048)
);

-- ============================================================
-- UPDATED_AT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS trg_profiles_updated_at
ON public.profiles;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


DROP TRIGGER IF EXISTS trg_stores_updated_at
ON public.stores;

CREATE TRIGGER trg_stores_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


DROP TRIGGER IF EXISTS trg_categories_updated_at
ON public.categories;

CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


DROP TRIGGER IF EXISTS trg_products_updated_at
ON public.products;

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


DROP TRIGGER IF EXISTS trg_affiliates_updated_at
ON public.affiliates;

CREATE TRIGGER trg_affiliates_updated_at
BEFORE UPDATE ON public.affiliates
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMIT;