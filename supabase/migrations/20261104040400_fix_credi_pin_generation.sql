-- Fix the auth.users -> profiles PIN default for isolated Preview and production parity.
-- The generator uses an empty search_path, so pgcrypto must be schema-qualified.
CREATE OR REPLACE FUNCTION public.generate_credi_pin()
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  candidate text;
BEGIN
  LOOP
    candidate := 'CRD-' || upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 10));
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE credi_pin = candidate
    );
  END LOOP;
  RETURN candidate;
END;
$function$;

REVOKE ALL ON FUNCTION public.generate_credi_pin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_credi_pin() TO authenticated, service_role;
