CREATE OR REPLACE FUNCTION public.generate_credi_pin()
RETURNS text
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
declare
  candidate text;
begin
  loop
    candidate := 'CRD-' || upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 10));
    exit when not exists (select 1 from public.profiles where credi_pin = candidate);
  end loop;
  return candidate;
end;
$function$;
