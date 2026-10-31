-- Transfer the Credi platform-owner flag to the current owner/admin login.
-- Platform ownership is an internal access flag, not a commercial subscription.
DO $$
DECLARE
  v_target_user_id uuid;
  v_target_count integer;
BEGIN
  SELECT count(*)
  INTO v_target_count
  FROM public.profiles
  WHERE lower(email) = lower('bazajhon@outlook.com')
    AND role = 'admin'::public.user_role
    AND is_active = true;

  IF v_target_count <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one active Credi platform-admin profile for the configured owner login; found %',
      v_target_count;
  END IF;

  SELECT id
  INTO STRICT v_target_user_id
  FROM public.profiles
  WHERE lower(email) = lower('bazajhon@outlook.com')
    AND role = 'admin'::public.user_role
    AND is_active = true;

  UPDATE public.profiles
  SET platform_owner = (id = v_target_user_id),
      updated_at = now()
  WHERE platform_owner IS DISTINCT FROM (id = v_target_user_id);

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_target_user_id
      AND platform_owner = true
      AND is_active = true
      AND role = 'admin'::public.user_role
  ) THEN
    RAISE EXCEPTION 'Platform-owner transfer verification failed';
  END IF;
END;
$$;
