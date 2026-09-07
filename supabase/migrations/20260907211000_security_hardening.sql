-- ============================================================
-- 20260907211000_security_hardening.sql
-- Runtime contract, RPC exposure and function search_path hardening
-- ============================================================

-- The existing 4-argument checkout RPC is kept as an internal
-- SECURITY DEFINER primitive, but is no longer executable by public
-- API roles. The 5-argument adapter is the only client-facing RPC.
REVOKE EXECUTE ON FUNCTION public.create_pending_order_batch(uuid, jsonb, text, text)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_pending_order_batch(
    p_buyer_id uuid,
    p_items jsonb,
    p_affiliate_ref text,
    p_region text,
    p_idempotency_key text DEFAULT NULL
)
RETURNS TABLE (
    order_id uuid,
    total_amount numeric(20,2),
    commission_amount numeric(20,2),
    currency char(3),
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result record;
    v_region text;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_buyer_id THEN
        RAISE EXCEPTION 'buyer_mismatch' USING ERRCODE = '42501';
    END IF;

    v_region := upper(left(nullif(btrim(p_region), ''), 32));
    IF v_region IS NULL THEN
        v_region := 'GLOBAL';
    END IF;

    SELECT *
      INTO v_result
      FROM public.create_pending_order_batch(
          p_buyer_id,
          p_items,
          p_affiliate_ref,
          p_idempotency_key
      );

    IF NOT FOUND THEN
        RAISE EXCEPTION 'order_creation_failed' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.orders
       SET region = v_region,
           updated_at = now()
     WHERE id = v_result.order_id
       AND buyer_id = p_buyer_id;

    order_id := v_result.order_id;
    total_amount := v_result.total_amount;
    commission_amount := v_result.commission_amount;
    currency := v_result.currency;
    status := v_result.status;
    RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_pending_order_batch(uuid, jsonb, text, text, text)
FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_pending_order_batch(uuid, jsonb, text, text, text)
TO authenticated;

-- Remove mutable search_path warnings from trigger/helper functions.
ALTER FUNCTION public.prevent_affiliate_self_referral() SET search_path = '';
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.set_idempotency_updated_at() SET search_path = '';
ALTER FUNCTION public.set_affiliate_updated_at() SET search_path = '';
ALTER FUNCTION public.set_listings_updated_at() SET search_path = '';
ALTER FUNCTION public.set_listing_offers_updated_at() SET search_path = '';
ALTER FUNCTION public.set_social_updated_at() SET search_path = '';
