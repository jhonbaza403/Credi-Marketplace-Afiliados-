REVOKE ALL ON FUNCTION public.prevent_platform_owner_client_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_platform_owner_client_change() FROM anon;
REVOKE ALL ON FUNCTION public.prevent_platform_owner_client_change() FROM authenticated;
REVOKE ALL ON FUNCTION public.submit_kyc_identity(text,text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_kyc_identity(text,text,text,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_kyc_identity(text,text,text,jsonb) TO authenticated;
