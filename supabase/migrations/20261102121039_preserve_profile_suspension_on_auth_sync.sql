-- Permit the trusted nested auth.users synchronization trigger to apply
-- customer/vendor registration roles, while rejecting direct client updates.
CREATE OR REPLACE FUNCTION public.prevent_platform_owner_client_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL
     AND pg_trigger_depth() = 1
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

-- Preserve an existing account suspension when Auth metadata is synchronized.
CREATE OR REPLACE FUNCTION public.sync_credi_profile_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  profile_role public.user_role;
  requested_role text;
  normalized_phone text;
  display_name text;
BEGIN
  requested_role := lower(coalesce(new.raw_user_meta_data->>'requested_role', 'customer'));

  profile_role := CASE
    WHEN requested_role IN ('vendor', 'customer') THEN requested_role::public.user_role
    ELSE 'customer'::public.user_role
  END;

  normalized_phone := public.normalize_credi_phone(new.raw_user_meta_data->>'phone_e164');
  display_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');

  INSERT INTO public.profiles (id, email, full_name, role, phone, is_active, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    display_name,
    profile_role,
    normalized_phone,
    true,
    coalesce(new.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = CASE
      WHEN public.profiles.role::text IN ('admin', 'professional', 'company') THEN public.profiles.role
      ELSE excluded.role
    END,
    phone = coalesce(excluded.phone, public.profiles.phone),
    updated_at = now();

  UPDATE public.profiles
  SET phone_e164 = coalesce(normalized_phone, phone_e164)
  WHERE id = new.id;

  RETURN new;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_credi_profile_from_auth() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_credi_profile_from_auth() FROM anon;
REVOKE ALL ON FUNCTION public.sync_credi_profile_from_auth() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_credi_profile_from_auth() TO postgres;
