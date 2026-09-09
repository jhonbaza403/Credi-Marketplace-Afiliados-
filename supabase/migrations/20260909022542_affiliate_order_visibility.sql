-- Keep Git history synchronized with the already-applied production migration.
-- Allows authenticated affiliates to read orders attributed to their affiliate account
-- while preserving buyer/admin visibility rules.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_orders_affiliate_id
  ON public.orders(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_affiliates_user_id_active
  ON public.affiliates(user_id, is_active);

DROP POLICY IF EXISTS orders_select_affiliate_related ON public.orders;
CREATE POLICY orders_select_affiliate_related
ON public.orders
FOR SELECT
TO authenticated
USING (
  buyer_id = (SELECT auth.uid())
  OR (SELECT public.is_admin())
  OR EXISTS (
    SELECT 1
    FROM public.affiliates a
    WHERE a.id = orders.affiliate_id
      AND a.user_id = (SELECT auth.uid())
      AND a.is_active = true
  )
);

DROP POLICY IF EXISTS order_items_select_affiliate_related ON public.order_items;
CREATE POLICY order_items_select_affiliate_related
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.buyer_id = (SELECT auth.uid())
        OR (SELECT public.is_admin())
        OR EXISTS (
          SELECT 1
          FROM public.affiliates a
          WHERE a.id = o.affiliate_id
            AND a.user_id = (SELECT auth.uid())
            AND a.is_active = true
        )
      )
  )
);

COMMIT;
