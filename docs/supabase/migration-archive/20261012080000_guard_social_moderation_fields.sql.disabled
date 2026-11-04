BEGIN;

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
  IF coalesce(auth.role(), '') = 'service_role' OR public.is_admin() THEN
    IF TG_TABLE_NAME = 'stories'
      AND OLD.moderation_status = 'pending'
      AND NEW.moderation_status = 'approved' THEN
      -- The 24-hour story lifetime starts when moderation approves it, not when submitted.
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

REVOKE ALL ON FUNCTION public.guard_social_moderation_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS feed_posts_guard_moderation_fields ON public.feed_posts;
CREATE TRIGGER feed_posts_guard_moderation_fields
BEFORE UPDATE ON public.feed_posts
FOR EACH ROW EXECUTE FUNCTION public.guard_social_moderation_fields();

DROP TRIGGER IF EXISTS stories_guard_moderation_fields ON public.stories;
CREATE TRIGGER stories_guard_moderation_fields
BEFORE UPDATE ON public.stories
FOR EACH ROW EXECUTE FUNCTION public.guard_social_moderation_fields();

DROP TRIGGER IF EXISTS reels_guard_moderation_fields ON public.reels;
CREATE TRIGGER reels_guard_moderation_fields
BEFORE UPDATE ON public.reels
FOR EACH ROW EXECUTE FUNCTION public.guard_social_moderation_fields();

DROP TRIGGER IF EXISTS advertisements_guard_moderation_fields ON public.advertisements;
CREATE TRIGGER advertisements_guard_moderation_fields
BEFORE UPDATE ON public.advertisements
FOR EACH ROW EXECUTE FUNCTION public.guard_social_moderation_fields();

COMMIT;
