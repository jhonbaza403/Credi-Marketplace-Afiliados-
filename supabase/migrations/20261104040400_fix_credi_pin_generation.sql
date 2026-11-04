-- Fix Preview account creation: auth.users -> profiles uses the Credi PIN default.
-- pgcrypto is installed in the extensions schema and the generator has an empty search_path.
-- Qualify its function explicitly rather than depending on an ambient search_path.

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
