-- Credi Marketplace security baseline
-- Idempotent hardening for affiliate product ownership data.

BEGIN;

ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'affiliate_products'
      AND policyname = 'affiliate_products_owner_select'
  ) THEN
    CREATE POLICY affiliate_products_owner_select
      ON public.affiliate_products
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.affiliates a
          WHERE a.id = affiliate_products.affiliate_id
            AND a.user_id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'affiliate_products'
      AND policyname = 'affiliate_products_owner_insert'
  ) THEN
    CREATE POLICY affiliate_products_owner_insert
      ON public.affiliate_products
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.affiliates a
          WHERE a.id = affiliate_products.affiliate_id
            AND a.user_id = (SELECT auth.uid())
            AND a.is_active = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'affiliate_products'
      AND policyname = 'affiliate_products_owner_update'
  ) THEN
    CREATE POLICY affiliate_products_owner_update
      ON public.affiliate_products
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.affiliates a
          WHERE a.id = affiliate_products.affiliate_id
            AND a.user_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.affiliates a
          WHERE a.id = affiliate_products.affiliate_id
            AND a.user_id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;

COMMIT;
