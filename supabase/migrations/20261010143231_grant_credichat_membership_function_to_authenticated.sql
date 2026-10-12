REVOKE EXECUTE ON FUNCTION private.credichat_is_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.credichat_is_member(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.credichat_is_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.credichat_is_member(uuid, uuid) TO authenticated;
