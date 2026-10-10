BEGIN;

-- Keep content owners from setting their own moderation or publication state.
-- Service-role operations (no auth.uid()) and trusted admins retain their workflow.
CREATE OR REPLACE FUNCTION public.enforce_social_content_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  old_row jsonb;
  new_row jsonb;
  content_changed boolean := false;
BEGIN
  new_row := to_jsonb(NEW);

  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    new_row := jsonb_set(new_row, '{moderation_status}', to_jsonb('pending'::text), true);
    IF TG_TABLE_NAME <> 'stories' THEN
      new_row := jsonb_set(new_row, '{status}', to_jsonb('draft'::text), true);
      new_row := jsonb_set(new_row, '{published_at}', 'null'::jsonb, true);
    END IF;
    RETURN jsonb_populate_record(NEW, new_row);
  END IF;

  old_row := to_jsonb(OLD);

  content_changed :=
    (old_row -> 'body') IS DISTINCT FROM (new_row -> 'body')
    OR (old_row -> 'media') IS DISTINCT FROM (new_row -> 'media')
    OR (old_row -> 'visibility') IS DISTINCT FROM (new_row -> 'visibility')
    OR (old_row -> 'title') IS DISTINCT FROM (new_row -> 'title')
    OR (old_row -> 'product_id') IS DISTINCT FROM (new_row -> 'product_id')
    OR (old_row -> 'catalog_id') IS DISTINCT FROM (new_row -> 'catalog_id')
    OR (old_row -> 'is_sponsored') IS DISTINCT FROM (new_row -> 'is_sponsored')
    OR (old_row -> 'affiliate_disclosure') IS DISTINCT FROM (new_row -> 'affiliate_disclosure');

  IF content_changed THEN
    new_row := jsonb_set(new_row, '{moderation_status}', to_jsonb('pending'::text), true);
    IF TG_TABLE_NAME <> 'stories' THEN
      new_row := jsonb_set(new_row, '{status}', to_jsonb('draft'::text), true);
      new_row := jsonb_set(new_row, '{published_at}', 'null'::jsonb, true);
    END IF;
  ELSE
    new_row := jsonb_set(new_row, '{moderation_status}', old_row -> 'moderation_status', true);
    IF TG_TABLE_NAME <> 'stories' THEN
      new_row := jsonb_set(new_row, '{status}', old_row -> 'status', true);
      new_row := jsonb_set(new_row, '{published_at}', old_row -> 'published_at', true);
    END IF;
  END IF;

  RETURN jsonb_populate_record(NEW, new_row);
END;
$$;

DROP TRIGGER IF EXISTS enforce_reels_moderation ON public.reels;
CREATE TRIGGER enforce_reels_moderation
BEFORE INSERT OR UPDATE ON public.reels
FOR EACH ROW EXECUTE FUNCTION public.enforce_social_content_moderation();

DROP TRIGGER IF EXISTS enforce_feed_posts_moderation ON public.feed_posts;
CREATE TRIGGER enforce_feed_posts_moderation
BEFORE INSERT OR UPDATE ON public.feed_posts
FOR EACH ROW EXECUTE FUNCTION public.enforce_social_content_moderation();

DROP TRIGGER IF EXISTS enforce_stories_moderation ON public.stories;
CREATE TRIGGER enforce_stories_moderation
BEFORE INSERT OR UPDATE ON public.stories
FOR EACH ROW EXECUTE FUNCTION public.enforce_social_content_moderation();

-- Stories must follow the same public visibility gate as posts and reels.
DROP POLICY IF EXISTS stories_select_public_or_own ON public.stories;
CREATE POLICY stories_select_public_or_own
ON public.stories
FOR SELECT TO anon, authenticated
USING (
  (visibility = 'public' AND expires_at > now() AND moderation_status = 'approved')
  OR owner_id = (SELECT auth.uid())
  OR (SELECT public.is_admin())
);

COMMIT;
