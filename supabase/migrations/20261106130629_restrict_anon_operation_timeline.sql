ALTER FUNCTION public.get_credi_operation_timeline(uuid) SET search_path = '';
REVOKE ALL ON FUNCTION public.get_credi_operation_timeline(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_credi_operation_timeline(uuid) TO authenticated, service_role;