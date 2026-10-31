-- Ensure service_role bypasses moderation checks without invoking helper
-- functions that are not executable by that database role.
CREATE OR REPLACE FUNCTION public.guard_social_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  protected_field text;
  protected_fields text[] := ARRAY[
    'status',
    'moderation_status',
    'published_at',
    'expires_at',
    'starts_at',
    'ends_at',
    'is_sponsored',
    'affiliate_disclosure'
  ];
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    IF TG_TABLE_NAME = 'stories'
      AND OLD.moderation_status = 'pending'
      AND NEW.moderation_status = 'approved' THEN
      NEW.expires_at := now() + interval '24 hours';
    END IF;
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    IF TG_TABLE_NAME = 'stories'
      AND OLD.moderation_status = 'pending'
      AND NEW.moderation_status = 'approved' THEN
      NEW.expires_at := now() + interval '24 hours';
    END IF;
    RETURN NEW;
  END IF;

  FOREACH protected_field IN ARRAY protected_fields LOOP
    IF (to_jsonb(NEW) -> protected_field) IS DISTINCT FROM (to_jsonb(OLD) -> protected_field) THEN
      RAISE EXCEPTION 'Social publication field "%" can only be changed by moderation or trusted services', protected_field
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
