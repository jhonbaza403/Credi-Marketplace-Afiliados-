DROP POLICY IF EXISTS chat_call_signals_insert_sender ON public.chat_call_signals;
CREATE POLICY chat_call_signals_insert_sender ON public.chat_call_signals FOR INSERT TO authenticated WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.chat_calls c
    WHERE c.id = chat_call_signals.call_id
      AND private.credichat_is_member(c.conversation_id, (SELECT auth.uid()))
  )
);

DROP POLICY IF EXISTS conversations_member_update ON public.conversations;
CREATE POLICY conversations_member_update ON public.conversations FOR UPDATE TO authenticated
USING (private.credichat_is_member(id, (SELECT auth.uid())))
WITH CHECK (private.credichat_is_member(id, (SELECT auth.uid())));

DROP POLICY IF EXISTS message_attachments_member_select ON public.message_attachments;
CREATE POLICY message_attachments_member_select ON public.message_attachments FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_attachments.message_id
      AND private.credichat_is_member(m.conversation_id, (SELECT auth.uid()))
  )
);

DROP POLICY IF EXISTS message_attachments_sender_insert ON public.message_attachments;
CREATE POLICY message_attachments_sender_insert ON public.message_attachments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_attachments.message_id
      AND m.sender_id = (SELECT auth.uid())
      AND private.credichat_is_member(m.conversation_id, (SELECT auth.uid()))
  )
);

DROP POLICY IF EXISTS messages_member_insert ON public.messages;
CREATE POLICY messages_member_insert ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND private.credichat_is_member(conversation_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS messages_member_select ON public.messages;
CREATE POLICY messages_member_select ON public.messages FOR SELECT TO authenticated
USING (private.credichat_is_member(conversation_id, (SELECT auth.uid())));

REVOKE EXECUTE ON FUNCTION public.credichat_is_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.credichat_is_member(uuid, uuid) TO authenticated;
