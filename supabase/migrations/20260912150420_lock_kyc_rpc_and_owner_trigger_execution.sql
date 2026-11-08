-- prevent_platform_owner_client_change() is created and revoked in the later
-- profile-privilege migration; do not revoke a function before it exists.
REVOKE ALL ON FUNCTION public.submit_kyc_identity(text,text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_kyc_identity(text,text,text,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_kyc_identity(text,text,text,jsonb) TO authenticated;
