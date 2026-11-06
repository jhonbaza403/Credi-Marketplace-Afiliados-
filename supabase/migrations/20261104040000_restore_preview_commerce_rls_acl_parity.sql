-- Align the isolated preview database with the existing Production security baseline.
-- The production RLS predicates and exact table-level grants were inspected before this
-- migration was applied to Preview. No production database is changed by this file.
-- Profile column grants depend on the existing 20261102120853/20261102121039 migrations.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Remove preview's broad default table grants, including TRUNCATE, REFERENCES and
-- TRIGGER (privileges that row-level policies do not restrict).
REVOKE ALL PRIVILEGES ON TABLE
  public.profiles, public.categories, public.stores, public.affiliates,
  public.orders, public.order_items, public.inventory_reservations,
  public.inventory_movements, public.affiliate_attributions,
  public.order_status_history, public.products, public.inventory,
  public.idempotency_keys, public.webhook_events
FROM anon, authenticated;

-- Reproduce the reviewed Production table-level grants exactly.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.categories, public.products, public.stores
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.categories, public.stores, public.affiliates, public.orders,
  public.order_items, public.inventory_reservations, public.inventory_movements,
  public.affiliate_attributions, public.order_status_history, public.products
TO authenticated;

-- Self-service profile editing is limited to non-privileged columns.
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url, phone, phone_e164)
  ON TABLE public.profiles TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='affiliate_attributions' AND policyname='affiliate_attributions_select_related') THEN
    CREATE POLICY affiliate_attributions_select_related ON public.affiliate_attributions
      FOR SELECT TO authenticated
      USING (
        buyer_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.affiliates a
          WHERE a.id = affiliate_attributions.affiliate_id
            AND a.user_id = (SELECT auth.uid())
        )
        OR (SELECT public.is_admin())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='affiliates' AND policyname='affiliates_delete_own') THEN
    CREATE POLICY affiliates_delete_own ON public.affiliates
      FOR DELETE TO authenticated
      USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='affiliates' AND policyname='affiliates_insert_own') THEN
    CREATE POLICY affiliates_insert_own ON public.affiliates
      FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='affiliates' AND policyname='affiliates_select_own') THEN
    CREATE POLICY affiliates_select_own ON public.affiliates
      FOR SELECT TO authenticated
      USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='affiliates' AND policyname='affiliates_update_own') THEN
    CREATE POLICY affiliates_update_own ON public.affiliates
      FOR UPDATE TO authenticated
      USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
      WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='categories_public_read') THEN
    CREATE POLICY categories_public_read ON public.categories
      FOR SELECT TO anon, authenticated USING (is_active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='inventory_movements' AND policyname='inventory_movements_select_own') THEN
    CREATE POLICY inventory_movements_select_own ON public.inventory_movements
      FOR SELECT TO authenticated
      USING (
        created_by = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = inventory_movements.order_id
            AND (o.buyer_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='inventory_reservations' AND policyname='inventory_reservations_select_own') THEN
    CREATE POLICY inventory_reservations_select_own ON public.inventory_reservations
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = inventory_reservations.order_id
            AND (o.buyer_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_status_history' AND policyname='order_history_select_own') THEN
    CREATE POLICY order_history_select_own ON public.order_status_history
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = order_status_history.order_id
            AND (o.buyer_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='products_owner_delete') THEN
    CREATE POLICY products_owner_delete ON public.products
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.stores s
          WHERE s.id = products.store_id
            AND (s.vendor_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='products_owner_update') THEN
    CREATE POLICY products_owner_update ON public.products
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.stores s
          WHERE s.id = products.store_id
            AND (s.vendor_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.stores s
          WHERE s.id = products.store_id
            AND (s.vendor_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='products_select_visible') THEN
    CREATE POLICY products_select_visible ON public.products
      FOR SELECT TO anon, authenticated
      USING (
        is_active = true
        OR EXISTS (
          SELECT 1 FROM public.stores s
          WHERE s.id = products.store_id
            AND (s.vendor_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_own') THEN
    CREATE POLICY profiles_update_own ON public.profiles
      FOR UPDATE TO authenticated
      USING (id = (SELECT auth.uid()))
      WITH CHECK (id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stores' AND policyname='stores_owner_delete') THEN
    CREATE POLICY stores_owner_delete ON public.stores
      FOR DELETE TO authenticated
      USING (vendor_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stores' AND policyname='stores_owner_insert') THEN
    CREATE POLICY stores_owner_insert ON public.stores
      FOR INSERT TO authenticated
      WITH CHECK (vendor_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stores' AND policyname='stores_owner_update') THEN
    CREATE POLICY stores_owner_update ON public.stores
      FOR UPDATE TO authenticated
      USING (vendor_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
      WITH CHECK (vendor_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stores' AND policyname='stores_select_visible') THEN
    CREATE POLICY stores_select_visible ON public.stores
      FOR SELECT TO anon, authenticated
      USING (
        (is_active = true AND is_verified = true)
        OR (
          (SELECT auth.uid()) IS NOT NULL
          AND (vendor_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
        )
      );
  END IF;
END
$$;
