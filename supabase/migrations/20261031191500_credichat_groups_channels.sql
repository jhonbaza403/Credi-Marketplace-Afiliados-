-- Credi Chat: private groups and broadcast channels.
-- Channel messages are restricted to conversation admins/support members.
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_kind_check;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_kind_check
  CHECK (kind IN ('direct', 'group', 'business', 'support', 'channel'));

-- A participant cannot join arbitrary conversations by guessing their UUID.
-- New memberships must be added by a conversation admin or trusted RPC.
DROP POLICY IF EXISTS conversation_members_insert ON public.conversation_members;
CREATE POLICY conversation_members_insert
  ON public.conversation_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.conversation_members actor
      WHERE actor.conversation_id = conversation_members.conversation_id
        AND actor.user_id = (SELECT auth.uid())
        AND actor.member_role IN ('admin', 'support')
    )
  );

-- Only channel owners/admins can publish to a channel. Group members can
-- continue to send messages according to the existing membership policy.
DROP POLICY IF EXISTS messages_member_insert ON public.messages;
CREATE POLICY messages_member_insert
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND private.credichat_is_member(conversation_id, (SELECT auth.uid()))
    AND (
      NOT EXISTS (
        SELECT 1
        FROM public.conversations c
        WHERE c.id = messages.conversation_id
          AND c.kind = 'channel'
      )
      OR EXISTS (
        SELECT 1
        FROM public.conversation_members cm
        WHERE cm.conversation_id = messages.conversation_id
          AND cm.user_id = (SELECT auth.uid())
          AND cm.member_role IN ('admin', 'support')
      )
    )
  );

CREATE OR REPLACE FUNCTION public.create_credichat_community(
  p_title text,
  p_kind text DEFAULT 'group',
  p_member_ids uuid[] DEFAULT '{}'::uuid[],
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_conversation_id uuid;
  v_member_ids uuid[];
  v_requested_count integer;
  v_valid_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;

  IF p_kind NOT IN ('group', 'channel') THEN
    RAISE EXCEPTION 'INVALID_COMMUNITY_KIND' USING ERRCODE = '22023';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) < 2 OR length(trim(p_title)) > 80 THEN
    RAISE EXCEPTION 'INVALID_COMMUNITY_TITLE' USING ERRCODE = '22023';
  END IF;

  IF p_description IS NOT NULL AND length(trim(p_description)) > 500 THEN
    RAISE EXCEPTION 'INVALID_COMMUNITY_DESCRIPTION' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT member_id), '{}'::uuid[])
  INTO v_member_ids
  FROM unnest(COALESCE(p_member_ids, '{}'::uuid[])) AS requested(member_id)
  WHERE member_id IS NOT NULL
    AND member_id <> v_user_id;

  v_requested_count := cardinality(v_member_ids);
  IF v_requested_count > 200 THEN
    RAISE EXCEPTION 'COMMUNITY_MEMBER_LIMIT_EXCEEDED' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer
  INTO v_valid_count
  FROM public.profiles p
  WHERE p.id = ANY(v_member_ids)
    AND p.is_active = true;

  IF v_valid_count <> v_requested_count THEN
    RAISE EXCEPTION 'COMMUNITY_MEMBER_NOT_AVAILABLE' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.conversations (
    created_by,
    kind,
    title,
    metadata
  )
  VALUES (
    v_user_id,
    p_kind,
    trim(p_title),
    jsonb_build_object(
      'description', NULLIF(trim(COALESCE(p_description, '')), ''),
      'visibility', 'private',
      'posting_policy', CASE WHEN p_kind = 'channel' THEN 'admins_only' ELSE 'all_members' END,
      'created_from', 'credi_chat'
    )
  )
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.conversation_members (conversation_id, user_id, member_role)
  VALUES (v_conversation_id, v_user_id, 'admin');

  INSERT INTO public.conversation_members (conversation_id, user_id, member_role)
  SELECT v_conversation_id, member_id, 'member'
  FROM unnest(v_member_ids) AS requested(member_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN v_conversation_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_credichat_community(text, text, uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_credichat_community(text, text, uuid[], text) TO authenticated;

COMMENT ON FUNCTION public.create_credichat_community(text, text, uuid[], text)
  IS 'Creates a private Credi Chat group or broadcast channel, assigning the creator as admin and validating invited active members.';
