-- ============================================================
-- 013_rls.sql
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- PROFILES
-- ============================================================

DROP POLICY IF EXISTS profiles_select_own
ON public.profiles;

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
);


DROP POLICY IF EXISTS profiles_update_own
ON public.profiles;

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    id = auth.uid()
)
WITH CHECK (
    id = auth.uid()
);


-- ============================================================
-- PRODUCTS
-- ============================================================

DROP POLICY IF EXISTS products_public_read
ON public.products;

CREATE POLICY products_public_read
ON public.products
FOR SELECT
TO anon, authenticated
USING (
    is_active = true
);


-- ============================================================
-- CATEGORIES
-- ============================================================

DROP POLICY IF EXISTS categories_public_read
ON public.categories;

CREATE POLICY categories_public_read
ON public.categories
FOR SELECT
TO anon, authenticated
USING (true);


-- ============================================================
-- STORES
-- ============================================================

DROP POLICY IF EXISTS stores_public_read
ON public.stores;

CREATE POLICY stores_public_read
ON public.stores
FOR SELECT
TO anon, authenticated
USING (
    is_verified = true
);


-- ============================================================
-- ORDERS
-- ============================================================

DROP POLICY IF EXISTS orders_select_own
ON public.orders;

CREATE POLICY orders_select_own
ON public.orders
FOR SELECT
TO authenticated
USING (
    customer_id = auth.uid()
);


-- ============================================================
-- ORDER ITEMS
-- ============================================================

DROP POLICY IF EXISTS order_items_select_own
ON public.order_items;

CREATE POLICY order_items_select_own
ON public.order_items
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = order_items.order_id
          AND o.customer_id = auth.uid()
    )
);


-- ============================================================
-- AFFILIATES
-- ============================================================

DROP POLICY IF EXISTS affiliates_select_own
ON public.affiliates;

CREATE POLICY affiliates_select_own
ON public.affiliates
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);


-- ============================================================
-- PAYMENTS
-- ============================================================

DROP POLICY IF EXISTS payments_select_own
ON public.payment_intents;

CREATE POLICY payments_select_own
ON public.payment_intents
FOR SELECT
TO authenticated
USING (
    customer_id = auth.uid()
);


-- ============================================================
-- ORDER HISTORY
-- ============================================================

DROP POLICY IF EXISTS order_history_select_own
ON public.order_status_history;

CREATE POLICY order_history_select_own
ON public.order_status_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = order_status_history.order_id
          AND o.customer_id = auth.uid()
    )
);


-- ============================================================
-- IDEMPOTENCY
-- ============================================================

DROP POLICY IF EXISTS idempotency_select_own
ON public.idempotency_keys;

CREATE POLICY idempotency_select_own
ON public.idempotency_keys
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);


-- ============================================================
-- WEBHOOKS
-- ============================================================

-- No se permite acceso directo desde el cliente.
-- Las operaciones se realizan exclusivamente desde
-- funciones/servidor.