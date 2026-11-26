-- ============================================================
-- TEST 010 — SECURITY
-- ============================================================

BEGIN;

-- ============================================================
-- PRECIOS
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM products
        WHERE price < 0
           OR price IS NULL
    ) THEN
        RAISE EXCEPTION
            'FALLO DE SEGURIDAD: producto con precio inválido';
    END IF;
END
$$;

-- ============================================================
-- STOCK
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM products
        WHERE stock < 0
    ) THEN
        RAISE EXCEPTION
            'FALLO DE SEGURIDAD: stock negativo';
    END IF;
END
$$;

-- ============================================================
-- ÓRDENES
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM orders
        WHERE total_amount < 0
           OR admin_commission < 0
    ) THEN
        RAISE EXCEPTION
            'FALLO DE SEGURIDAD: importe financiero negativo';
    END IF;
END
$$;

-- ============================================================
-- ORDER ITEMS
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM order_items
        WHERE quantity <= 0
           OR unit_price < 0
           OR subtotal < 0
    ) THEN
        RAISE EXCEPTION
            'FALLO DE SEGURIDAD: order_item inválido';
    END IF;
END
$$;

-- ============================================================
-- PAGOS
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM payments
        WHERE amount <= 0
    ) THEN
        RAISE EXCEPTION
            'FALLO DE SEGURIDAD: pago con importe inválido';
    END IF;
END
$$;

-- ============================================================
-- WEBHOOKS
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM webhook_events
        WHERE event_id IS NULL
           OR received_at IS NULL
    ) THEN
        RAISE EXCEPTION
            'FALLO DE SEGURIDAD: webhook incompleto';
    END IF;
END
$$;

-- ============================================================
-- WALLET REFUND RPC CONTRACT
-- ============================================================

DO $$
DECLARE
    v_private_oid oid := to_regprocedure('private.wallet_refund_order(uuid,numeric,text,text)');
    v_public_oid oid := to_regprocedure('public.wallet_refund_order(uuid,numeric,text,text)');
    v_private_definer boolean;
    v_public_definer boolean;
BEGIN
    IF v_private_oid IS NULL OR v_public_oid IS NULL THEN
        RAISE EXCEPTION 'WALLET REFUND RPC CONTRACT: required private implementation or public wrapper is missing';
    END IF;

    SELECT prosecdef INTO v_private_definer FROM pg_proc WHERE oid = v_private_oid;
    SELECT prosecdef INTO v_public_definer FROM pg_proc WHERE oid = v_public_oid;

    IF v_private_definer IS DISTINCT FROM true OR v_public_definer IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'WALLET REFUND RPC CONTRACT: private implementation and public wrapper must be SECURITY DEFINER';
    END IF;

    IF has_function_privilege('anon', v_private_oid, 'EXECUTE')
       OR has_function_privilege('anon', v_public_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'WALLET REFUND RPC CONTRACT: anon must not execute refund functions';
    END IF;

    IF has_function_privilege('authenticated', v_private_oid, 'EXECUTE')
       OR NOT has_function_privilege('authenticated', v_public_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'WALLET REFUND RPC CONTRACT: only the public wrapper may be executed by authenticated';
    END IF;

    IF has_schema_privilege('anon', 'private', 'USAGE') THEN
        RAISE EXCEPTION 'WALLET REFUND RPC CONTRACT: anon must not have private schema usage';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE oid = v_public_oid
          AND coalesce(array_to_string(proconfig, ','), '') LIKE '%search_path=%'
    ) THEN
        RAISE EXCEPTION 'WALLET REFUND RPC CONTRACT: public wrapper search_path must be pinned';
    END IF;
END
$$;

-- PRODUCTION / PREVIEW POLICY PARITY CONTRACT
DO $$
DECLARE
  v_qual text;
  v_check text;
BEGIN
  SELECT qual INTO v_qual FROM pg_policies
  WHERE schemaname='public' AND tablename='stories'
    AND policyname='stories_select_public_or_own';
  IF v_qual IS NULL OR position('moderation_status' in v_qual)=0
     OR position('approved' in v_qual)=0 THEN
    RAISE EXCEPTION 'RLS CONTRACT: public stories must require approved moderation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND policyname IN ('advertisements_owner_write','feed_posts_owner_write','reels_owner_write','stories_owner_write')
  ) THEN
    RAISE EXCEPTION 'RLS CONTRACT: redundant owner_write ALL policies remain';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tax_collections'
      AND policyname='tax_collections_deny_clients'
      AND permissive='RESTRICTIVE' AND qual='false' AND with_check='false'
  ) THEN
    RAISE EXCEPTION 'RLS CONTRACT: tax_collections client access must be denied restrictively';
  END IF;

  SELECT with_check INTO v_check FROM pg_policies
  WHERE schemaname='public' AND tablename='chat_live_products'
    AND policyname='chat_live_products_host_write';
  IF v_check IS NULL OR position('stock' in v_check)=0 OR position('vendor_id' in v_check)=0 THEN
    RAISE EXCEPTION 'RLS CONTRACT: LIVE products must be active/in-stock and owned by host store';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='affiliate_clicks'
      AND policyname='affiliate_clicks_select_own' AND position('is_admin' in qual)>0
  ) THEN
    RAISE EXCEPTION 'RLS CONTRACT: affiliate click admin read parity is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='b2b_crypto_payment_intents'
      AND policyname='b2b_crypto_payment_select_own' AND position('is_admin' in qual)>0
  ) THEN
    RAISE EXCEPTION 'RLS CONTRACT: B2B payment admin read parity is missing';
  END IF;
END
$$;


-- Credi Chat RPC and policy privilege parity.
DO $
DECLARE
  v_public_helper oid := to_regprocedure('public.credichat_member_profile_ids(uuid[])');
  v_private_helper oid := to_regprocedure('private.credichat_member_profile_ids(uuid[])');
  v_qual text;
BEGIN
  IF v_public_helper IS NULL OR v_private_helper IS NULL THEN
    RAISE EXCEPTION 'CREDICHAT CONTRACT: expected public compatibility and private helpers';
  END IF;

  IF has_function_privilege('authenticated', v_public_helper, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', v_private_helper, 'EXECUTE') THEN
    RAISE EXCEPTION 'CREDICHAT CONTRACT: profile member lookup must execute only through private helper';
  END IF;

  SELECT qual INTO v_qual
  FROM pg_policies
  WHERE schemaname='public' AND tablename='profiles'
    AND policyname='profiles_select_credichat_members';
  IF v_qual IS NULL OR position('private.credichat_member_profile_ids' in v_qual)=0 THEN
    RAISE EXCEPTION 'CREDICHAT CONTRACT: profiles member policy must use the private helper';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid IN (
      to_regprocedure('public.credichat_mark_call_seen(uuid)'),
      to_regprocedure('public.credichat_record_call_status(uuid,text,text)'),
      to_regprocedure('public.ensure_my_credi_pin()'),
      to_regprocedure('public.set_my_credi_phone(text)')
    )
    AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'CREDICHAT CONTRACT: user-scoped call/profile RPCs must use SECURITY INVOKER';
  END IF;

  IF has_function_privilege('anon','public.credichat_mark_call_seen(uuid)','EXECUTE')
     OR has_function_privilege('anon','public.credichat_record_call_status(uuid,text,text)','EXECUTE')
     OR has_function_privilege('anon','public.ensure_my_credi_pin()','EXECUTE')
     OR has_function_privilege('anon','public.set_my_credi_phone(text)','EXECUTE') THEN
    RAISE EXCEPTION 'CREDICHAT CONTRACT: anon must not execute call/profile RPCs';
  END IF;
END
$;

RAISE NOTICE 'TEST 010 — SECURITY: PASS';

ROLLBACK;