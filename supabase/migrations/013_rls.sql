-- ============================================================
-- 013_rls.sql
-- Row Level Security for core marketplace tables
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update only their own profile.
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Stores: public can read active verified stores; owners manage their own store.
DROP POLICY IF EXISTS stores_public_read ON public.stores;
CREATE POLICY stores_public_read
ON public.stores FOR SELECT TO anon, authenticated
USING (is_active = true AND is_verified = true);

DROP POLICY IF EXISTS stores_owner_all ON public.stores;
CREATE POLICY stores_owner_all
ON public.stores FOR ALL TO authenticated
USING (vendor_id = auth.uid())
WITH CHECK (vendor_id = auth.uid());

-- Categories: public catalog read.
DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_public_read
ON public.categories FOR SELECT TO anon, authenticated
USING (is_active = true);

-- Products: public active catalog read; store owners manage their products.
DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read
ON public.products FOR SELECT TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS products_owner_all ON public.products;
CREATE POLICY products_owner_all
ON public.products FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = products.store_id
          AND s.vendor_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = products.store_id
          AND s.vendor_id = auth.uid()
    )
);

-- Orders are created/updated by trusted server functions only; buyers can read their orders.
DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own
ON public.orders FOR SELECT TO authenticated
USING (buyer_id = auth.uid());

-- Order items: readable through the buyer's order.
DROP POLICY IF EXISTS order_items_select_own ON public.order_items;
CREATE POLICY order_items_select_own
ON public.order_items FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
          AND o.buyer_id = auth.uid()
    )
);

-- Inventory and webhook/idempotency tables remain server-only by policy design.
-- RLS is enabled without client policies, so anon/authenticated cannot access them directly.

DROP POLICY IF EXISTS inventory_reservations_select_own ON public.inventory_reservations;
CREATE POLICY inventory_reservations_select_own
ON public.inventory_reservations FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = inventory_reservations.order_id
          AND o.buyer_id = auth.uid()
    )
);

DROP POLICY IF EXISTS inventory_movements_select_own ON public.inventory_movements;
CREATE POLICY inventory_movements_select_own
ON public.inventory_movements FOR SELECT TO authenticated
USING (
    created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = inventory_movements.order_id
          AND o.buyer_id = auth.uid()
    )
);

-- Affiliates: users manage only their own affiliate account.
DROP POLICY IF EXISTS affiliates_select_own ON public.affiliates;
CREATE POLICY affiliates_select_own
ON public.affiliates FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS affiliates_insert_own ON public.affiliates;
CREATE POLICY affiliates_insert_own
ON public.affiliates FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS affiliates_update_own ON public.affiliates;
CREATE POLICY affiliates_update_own
ON public.affiliates FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS affiliates_delete_own ON public.affiliates;
CREATE POLICY affiliates_delete_own
ON public.affiliates FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Attribution: buyer or affiliate owner may read; writes are server-only.
DROP POLICY IF EXISTS affiliate_attributions_select_related ON public.affiliate_attributions;
CREATE POLICY affiliate_attributions_select_related
ON public.affiliate_attributions FOR SELECT TO authenticated
USING (
    buyer_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.affiliates a
        WHERE a.id = affiliate_attributions.affiliate_id
          AND a.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS order_history_select_own ON public.order_status_history;
CREATE POLICY order_history_select_own
ON public.order_status_history FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_status_history.order_id
          AND o.buyer_id = auth.uid()
    )
);
