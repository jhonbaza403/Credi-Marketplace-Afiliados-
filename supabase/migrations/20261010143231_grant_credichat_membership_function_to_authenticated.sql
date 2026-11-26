-- Create private membership helpers before routing RLS policies through them.
-- The definitions match the later Production/Preview helper reconciliation.
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.credichat_is_member(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND p_conversation_id IS NOT NULL
    AND p_user_id IS NOT NULL
    AND p_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.conversation_members cm
      WHERE cm.conversation_id = p_conversation_id
        AND cm.user_id = p_user_id
    );
$function$;

REVOKE ALL ON FUNCTION private.credichat_is_member(uuid,uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.credichat_is_member(uuid,uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION private.credichat_member_profile_ids(
  p_conversation_ids uuid[]
)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT DISTINCT cm.user_id
  FROM public.conversation_members cm
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND coalesce(array_length(p_conversation_ids,1),0) BETWEEN 1 AND 100
    AND cm.conversation_id = ANY(p_conversation_ids)
    AND EXISTS (
      SELECT 1
      FROM public.conversation_members me
      WHERE me.conversation_id = cm.conversation_id
        AND me.user_id = (SELECT auth.uid())
    );
$function$;

REVOKE ALL ON FUNCTION private.credichat_member_profile_ids(uuid[])
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.credichat_member_profile_ids(uuid[])
  TO authenticated;

-- Keep the older exposed helper callable only by authenticated participants;
-- the next migration moves all membership RLS predicates to the private helper.
REVOKE EXECUTE ON FUNCTION public.credichat_is_member(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.credichat_is_member(uuid, uuid)
  TO authenticated;
