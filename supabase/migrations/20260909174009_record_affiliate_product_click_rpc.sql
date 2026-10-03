CREATE OR REPLACE FUNCTION public.record_affiliate_product_click(p_link_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_clicks bigint;
BEGIN
  UPDATE public.affiliate_product_links
     SET clicks = clicks + 1,
         updated_at = now()
   WHERE id = p_link_id
     AND is_active = true
  RETURNING clicks INTO next_clicks;

  IF next_clicks IS NULL THEN
    RAISE EXCEPTION 'affiliate link not active';
  END IF;

  RETURN next_clicks;
END;
$$;

REVOKE ALL ON FUNCTION public.record_affiliate_product_click(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_affiliate_product_click(uuid) TO anon, authenticated, service_role;
