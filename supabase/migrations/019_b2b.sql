-- ============================================================
-- 019_b2b.sql
-- Credi Marketplace
-- Sistema B2B / Mayoristas
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Proveedores B2B
-- ============================================================

CREATE TABLE IF NOT EXISTS public.b2b_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  owner_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE RESTRICT,

  legal_name text NOT NULL,
  display_name text NOT NULL,

  tax_id text NULL,

  description text NULL,

  country_code text NULL,

  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT b2b_suppliers_display_name_check
    CHECK (length(trim(display_name)) BETWEEN 2 AND 200),

  CONSTRAINT b2b_suppliers_country_check
    CHECK (
      country_code IS NULL
      OR (
        length(country_code) = 2
        AND country_code = upper(country_code)
      )
    )
);

-- ============================================================
-- 2. Productos B2B
-- ============================================================

CREATE TABLE IF NOT EXISTS public.b2b_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  supplier_id uuid NOT NULL
    REFERENCES public.b2b_suppliers(id)
    ON DELETE RESTRICT,

  product_id uuid NULL
    REFERENCES public.products(id)
    ON DELETE SET NULL,

  title text NOT NULL,
  slug text NOT NULL,

  description text NULL,

  category text NULL,

  image_url text NULL,

  unit_price_usdt numeric(20, 8) NOT NULL,

  moq integer NOT NULL DEFAULT 1,

  stock_available integer NOT NULL DEFAULT 0,

  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT b2b_products_price_check
    CHECK (unit_price_usdt > 0),

  CONSTRAINT b2b_products_moq_check
    CHECK (moq > 0),

  CONSTRAINT b2b_products_stock_check
    CHECK (stock_available >= 0),

  CONSTRAINT b2b_products_title_check
    CHECK (length(trim(title)) BETWEEN 2 AND 250),

  CONSTRAINT b2b_products_slug_check
    CHECK (length(trim(slug)) BETWEEN 2 AND 250),

  CONSTRAINT b2b_products_unique_slug
    UNIQUE (slug)
);

-- ============================================================
-- 3. Precios por volumen
-- ============================================================

CREATE TABLE IF NOT EXISTS public.b2b_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  b2b_product_id uuid NOT NULL
    REFERENCES public.b2b_products(id)
    ON DELETE CASCADE,

  min_quantity integer NOT NULL,

  unit_price_usdt numeric(20, 8) NOT NULL,

  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT b2b_pricing_quantity_check
    CHECK (min_quantity > 0),

  CONSTRAINT b2b_pricing_price_check
    CHECK (unit_price_usdt > 0),

  CONSTRAINT b2b_pricing_unique_quantity
    UNIQUE (b2b_product_id, min_quantity)
);

-- ============================================================
-- 4. Órdenes B2B
-- ============================================================

CREATE TABLE IF NOT EXISTS public.b2b_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  buyer_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE RESTRICT,

  supplier_id uuid NOT NULL
    REFERENCES public.b2b_suppliers(id)
    ON DELETE RESTRICT,

  status text NOT NULL DEFAULT 'pending',

  currency text NOT NULL DEFAULT 'USDT',

  subtotal numeric(20, 8) NOT NULL DEFAULT 0,

  shipping_amount numeric(20, 8) NOT NULL DEFAULT 0,

  commission_amount numeric(20, 8) NOT NULL DEFAULT 0,

  total_amount numeric(20, 8) NOT NULL DEFAULT 0,

  payment_reference text NULL,

  notes text NULL,

  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT b2b_orders_status_check
    CHECK (
      status IN (
        'pending',
        'payment_pending',
        'paid',
        'processing',
        'shipped',
        'completed',
        'cancelled',
        'refunded'
      )
    ),

  CONSTRAINT b2b_orders_currency_check
    CHECK (currency = 'USDT'),

  CONSTRAINT b2b_orders_subtotal_check
    CHECK (subtotal >= 0),

  CONSTRAINT b2b_orders_shipping_check
    CHECK (shipping_amount >= 0),

  CONSTRAINT b2b_orders_commission_check
    CHECK (commission_amount >= 0),

  CONSTRAINT b2b_orders_total_check
    CHECK (total_amount >= 0)
);

-- ============================================================
-- 5. Líneas B2B
-- ============================================================

CREATE TABLE IF NOT EXISTS public.b2b_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id uuid NOT NULL
    REFERENCES public.b2b_orders(id)
    ON DELETE CASCADE,

  b2b_product_id uuid NOT NULL
    REFERENCES public.b2b_products(id)
    ON DELETE RESTRICT,

  quantity integer NOT NULL,

  unit_price_usdt numeric(20, 8) NOT NULL,

  subtotal numeric(20, 8) NOT NULL,

  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT b2b_order_items_quantity_check
    CHECK (quantity > 0),

  CONSTRAINT b2b_order_items_price_check
    CHECK (unit_price_usdt > 0),

  CONSTRAINT b2b_order_items_subtotal_check
    CHECK (subtotal >= 0)
);

-- ============================================================
-- 6. Términos de pago
-- ============================================================

CREATE TABLE IF NOT EXISTS public.b2b_payment_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  b2b_order_id uuid NOT NULL
    REFERENCES public.b2b_orders(id)
    ON DELETE CASCADE,

  method text NOT NULL,

  status text NOT NULL DEFAULT 'pending',

  provider_reference text NULL,

  amount_usdt numeric(20, 8) NOT NULL,

  confirmed_at timestamptz NULL,

  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT b2b_payment_terms_method_check
    CHECK (
      method IN (
        'binance_pay',
        'usdt',
        'bank_transfer'
      )
    ),

  CONSTRAINT b2b_payment_terms_status_check
    CHECK (
      status IN (
        'pending',
        'confirmed',
        'failed',
        'cancelled',
        'refunded'
      )
    ),

  CONSTRAINT b2b_payment_terms_amount_check
    CHECK (amount_usdt > 0)
);

-- ============================================================
-- 7. Índices
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_b2b_suppliers_owner
ON public.b2b_suppliers(owner_id);

CREATE INDEX IF NOT EXISTS idx_b2b_suppliers_active
ON public.b2b_suppliers(is_active, is_verified);

CREATE INDEX IF NOT EXISTS idx_b2b_products_supplier
ON public.b2b_products(supplier_id);

CREATE INDEX IF NOT EXISTS idx_b2b_products_active
ON public.b2b_products(is_active);

CREATE INDEX IF NOT EXISTS idx_b2b_products_category
ON public.b2b_products(category);

CREATE INDEX IF NOT EXISTS idx_b2b_pricing_product
ON public.b2b_pricing(b2b_product_id, min_quantity);

CREATE INDEX IF NOT EXISTS idx_b2b_orders_buyer
ON public.b2b_orders(buyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_b2b_orders_supplier
ON public.b2b_orders(supplier_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_b2b_orders_status
ON public.b2b_orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_b2b_order_items_order
ON public.b2b_order_items(order_id);

-- ============================================================
-- 8. updated_at
-- ============================================================

DROP TRIGGER IF EXISTS trg_b2b_suppliers_updated_at
ON public.b2b_suppliers;

CREATE TRIGGER trg_b2b_suppliers_updated_at
BEFORE UPDATE
ON public.b2b_suppliers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_b2b_products_updated_at
ON public.b2b_products;

CREATE TRIGGER trg_b2b_products_updated_at
BEFORE UPDATE
ON public.b2b_products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_b2b_orders_updated_at
ON public.b2b_orders;

CREATE TRIGGER trg_b2b_orders_updated_at
BEFORE UPDATE
ON public.b2b_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 9. RLS
-- ============================================================

ALTER TABLE public.b2b_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_payment_terms ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. Productos B2B públicos activos
-- ============================================================

DROP POLICY IF EXISTS b2b_products_public_read
ON public.b2b_products;

CREATE POLICY b2b_products_public_read
ON public.b2b_products
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
);

-- ============================================================
-- 11. Precios B2B públicos activos
-- ============================================================

DROP POLICY IF EXISTS b2b_pricing_public_read
ON public.b2b_pricing;

CREATE POLICY b2b_pricing_public_read
ON public.b2b_pricing
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.b2b_products p
    WHERE p.id = b2b_pricing.b2b_product_id
      AND p.is_active = true
  )
);

-- ============================================================
-- 12. Proveedores
-- ============================================================

DROP POLICY IF EXISTS b2b_suppliers_public_read
ON public.b2b_suppliers;

CREATE POLICY b2b_suppliers_public_read
ON public.b2b_suppliers
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND is_verified = true
);

DROP POLICY IF EXISTS b2b_suppliers_owner_update
ON public.b2b_suppliers;

CREATE POLICY b2b_suppliers_owner_update
ON public.b2b_suppliers
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
)
WITH CHECK (
  owner_id = auth.uid()
);

-- ============================================================
-- 13. Órdenes B2B — comprador
-- ============================================================

DROP POLICY IF EXISTS b2b_orders_buyer_select
ON public.b2b_orders;

CREATE POLICY b2b_orders_buyer_select
ON public.b2b_orders
FOR SELECT
TO authenticated
USING (
  buyer_id = auth.uid()
);

-- ============================================================
-- 14. Items B2B — comprador
-- ============================================================

DROP POLICY IF EXISTS b2b_order_items_buyer_select
ON public.b2b_order_items;

CREATE POLICY b2b_order_items_buyer_select
ON public.b2b_order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.b2b_orders o
    WHERE o.id = b2b_order_items.order_id
      AND o.buyer_id = auth.uid()
  )
);

-- ============================================================
-- 15. Payment terms — comprador
-- ============================================================

DROP POLICY IF EXISTS b2b_payment_terms_buyer_select
ON public.b2b_payment_terms;

CREATE POLICY b2b_payment_terms_buyer_select
ON public.b2b_payment_terms
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.b2b_orders o
    WHERE o.id = b2b_payment_terms.b2b_order_id
      AND o.buyer_id = auth.uid()
  )
);

COMMIT;