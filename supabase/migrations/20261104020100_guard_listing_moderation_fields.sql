-- Protect listing moderation state from owner-controlled writes.
-- This is a forward migration; the historical listings baseline is restored
-- separately before the original migration that extends the relation.
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_listing_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF coalesce(auth.role(), '') = 'authenticated'
     AND NOT coalesce(public.is_admin(), false) THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.moderation_status <> 'pending' THEN
        RAISE EXCEPTION 'Authenticated users cannot set listing moderation status'
          USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
      RAISE EXCEPTION 'Authenticated users cannot change listing moderation status'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_listing_moderation_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_listing_moderation_fields() FROM anon;
REVOKE ALL ON FUNCTION public.guard_listing_moderation_fields() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.guard_listing_moderation_fields() TO service_role;

DROP TRIGGER IF EXISTS trg_guard_listing_moderation_fields ON public.listings;
CREATE TRIGGER trg_guard_listing_moderation_fields
BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.guard_listing_moderation_fields();

COMMIT;
