-- Restrict self-service profile updates to non-privileged identity fields.
-- This migration is applied to production as 20261102120853.
-- Privileged role and account-state changes remain server-controlled.

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url, phone, phone_e164)
  ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_platform_owner_client_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL
     AND (
       OLD.id IS DISTINCT FROM NEW.id
       OR OLD.role IS DISTINCT FROM NEW.role
       OR OLD.platform_owner IS DISTINCT FROM NEW.platform_owner
       OR OLD.is_active IS DISTINCT FROM NEW.is_active
     ) THEN
    RAISE EXCEPTION 'PROFILE_PRIVILEGED_FIELDS_IMMUTABLE'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.prevent_platform_owner_client_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_platform_owner_client_change() FROM anon;
REVOKE ALL ON FUNCTION public.prevent_platform_owner_client_change() FROM authenticated;
