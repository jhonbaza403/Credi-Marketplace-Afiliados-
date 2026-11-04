-- Credi Marketplace core schema regression checks.
BEGIN;
DO $$
DECLARE
  required_table text;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'profiles', 'stores', 'categories', 'products', 'orders', 'order_items',
    'inventory', 'idempotency_keys', 'affiliates', 'payment_methods',
    'payment_orchestrations', 'webhook_events', 'order_status_history',
    'notifications', 'tax_transactions'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = required_table
    ) THEN
      RAISE EXCEPTION 'Required public table is missing: %', required_table;
    END IF;
  END LOOP;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.products WHERE price < 0 OR stock < 0) THEN
    RAISE EXCEPTION 'Products cannot have negative price or stock';
  END IF;
  IF EXISTS (SELECT 1 FROM public.categories WHERE btrim(name) = '') THEN
    RAISE EXCEPTION 'Categories cannot have empty names';
  END IF;
  IF EXISTS (
    SELECT slug FROM public.products
    GROUP BY slug HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Product slugs must remain unique';
  END IF;
END $$;
SELECT 'TEST 001 — CORE SCHEMA: PASS' AS test_result;
ROLLBACK;
