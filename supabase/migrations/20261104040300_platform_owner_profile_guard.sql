-- Ensure profile privileged fields are protected by the hardened trigger function.
-- The function body is defined by 20261102120853 and hardened by 20261102121039.
-- Keep the already-reviewed SECURITY DEFINER function unchanged here.
DO $$
BEGIN
  IF to_regprocedure('public.prevent_platform_owner_client_change()') IS NULL THEN
    RAISE EXCEPTION 'Missing public.prevent_platform_owner_client_change()';
  END IF;
END
$$;

DROP TRIGGER IF EXISTS trg_protect_platform_owner ON public.profiles;
CREATE TRIGGER trg_protect_platform_owner
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_platform_owner_client_change();
