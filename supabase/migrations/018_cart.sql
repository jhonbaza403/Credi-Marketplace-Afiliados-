-- ============================================================
-- 018_cart.sql
-- Credi Marketplace
-- Carrito persistente y sincronización usuario/checkout
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Carts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  session_id text NULL,

  status text NOT NULL DEFAULT 'active',

  currency text NOT NULL DEFAULT 'USD',

  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT carts_status_check
    CHECK (
      status IN (
        'active',
        'converted',
        'abandoned',
        'expired'
      )
    ),

  CONSTRAINT carts_currency_check
    CHECK (
      currency = upper(currency)
      AND length(currency) = 3
    ),

  CONSTRAINT carts_owner_check
    CHECK (
      user_id IS NOT NULL
      OR session_id IS NOT NULL
    )
);

-- ============================================================
-- 2. Cart items
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  cart_id uuid NOT NULL
    REFERENCES public.carts(id)
    ON DELETE CASCADE,

  product_id uuid NOT NULL
    REFERENCES public.products(id)
    ON DELETE RESTRICT,

  quantity integer NOT NULL,

  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT cart_items_quantity_check
    CHECK (quantity > 0 AND quantity <= 1000),

  CONSTRAINT cart_items_unique_product
    UNIQUE (cart_id, product_id)
);

-- ============================================================
-- 3. Un solo carrito activo por usuario
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_cart_user
ON public.carts(user_id)
WHERE user_id IS NOT NULL
  AND status = 'active';

-- ============================================================
-- 4. Un solo carrito activo por sesión
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_cart_session
ON public.carts(session_id)
WHERE session_id IS NOT NULL
  AND status = 'active';

-- ============================================================
-- 5. Índices
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_carts_user
ON public.carts(user_id);

CREATE INDEX IF NOT EXISTS idx_carts_session
ON public.carts(session_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart
ON public.cart_items(cart_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_product
ON public.cart_items(product_id);

-- ============================================================
-- 6. updated_at
-- ============================================================

DROP TRIGGER IF EXISTS trg_carts_updated_at
ON public.carts;

CREATE TRIGGER trg_carts_updated_at
BEFORE UPDATE
ON public.carts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cart_items_updated_at
ON public.cart_items;

CREATE TRIGGER trg_cart_items_updated_at
BEFORE UPDATE
ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 7. RLS
-- ============================================================

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. Cart policies
-- ============================================================

DROP POLICY IF EXISTS carts_select_own
ON public.carts;

CREATE POLICY carts_select_own
ON public.carts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS carts_insert_own
ON public.carts;

CREATE POLICY carts_insert_own
ON public.carts
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS carts_update_own
ON public.carts;

CREATE POLICY carts_update_own
ON public.carts
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS carts_delete_own
ON public.carts;

CREATE POLICY carts_delete_own
ON public.carts
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);

-- ============================================================
-- 9. Cart items policies
-- ============================================================

DROP POLICY IF EXISTS cart_items_select_own
ON public.cart_items;

CREATE POLICY cart_items_select_own
ON public.cart_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS cart_items_insert_own
ON public.cart_items;

CREATE POLICY cart_items_insert_own
ON public.cart_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS cart_items_update_own
ON public.cart_items;

CREATE POLICY cart_items_update_own
ON public.cart_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS cart_items_delete_own
ON public.cart_items;

CREATE POLICY cart_items_delete_own
ON public.cart_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND c.user_id = auth.uid()
  )
);

COMMIT;