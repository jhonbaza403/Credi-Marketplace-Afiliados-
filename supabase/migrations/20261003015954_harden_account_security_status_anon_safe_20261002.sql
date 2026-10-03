-- Harden account-security status RPC.
-- Anonymous callers receive a neutral state; authenticated callers can inspect only their own account.
-- Keep the function SECURITY DEFINER so it can read the protected security tables without weakening their RLS.

CREATE OR REPLACE FUNCTION public.credi_account_security_status(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  is_platform_owner boolean,
  is_admin boolean,
  has_active_subscription boolean,
  has_mfa boolean,
  has_security_key boolean,
  has_profile_photos boolean,
  identity_approved boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR p_user_id IS DISTINCT FROM v_uid THEN
    RETURN QUERY
    SELECT false, false, false, false, false, false, false;
    RETURN;
  END IF;

  RETURN QUERY
  WITH p AS (
    SELECT
      coalesce(platform_owner, false) AS platform_owner,
      role = 'admin'::public.user_role AS admin
    FROM public.profiles
    WHERE id = v_uid
    LIMIT 1
  )
  SELECT
    coalesce((SELECT platform_owner FROM p), false),
    coalesce((SELECT admin FROM p), false),
    EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = v_uid
        AND s.status IN ('active','trialing')
        AND (
          s.current_period_end IS NULL
          OR s.current_period_end > now()
          OR s.billing_interval = 'free'
        )
    ),
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2',
    coalesce(auth.jwt() -> 'app_metadata' ->> 'security_key_enrolled', 'false') = 'true',
    EXISTS (
      SELECT 1
      FROM public.profile_verification_photos v
      WHERE v.user_id = v_uid
        AND v.status IN ('submitted','approved')
        AND v.front_path IS NOT NULL
        AND v.left_path IS NOT NULL
        AND v.right_path IS NOT NULL
    ),
    EXISTS (
      SELECT 1
      FROM public.kyc_cases k
      WHERE k.user_id = v_uid
        AND k.status = 'approved'
        AND (k.expires_at IS NULL OR k.expires_at > now())
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.credi_account_security_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credi_account_security_status(uuid) TO anon, authenticated;
