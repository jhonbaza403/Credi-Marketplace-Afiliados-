BEGIN;

-- Private Realtime broadcast and presence authorization for Credi LIVE.
DROP POLICY IF EXISTS credichat_live_broadcast_read ON realtime.messages;
CREATE POLICY credichat_live_broadcast_read
ON realtime.messages FOR SELECT TO authenticated
USING (
  extension = 'broadcast'
  AND EXISTS (
    SELECT 1
    FROM public.chat_live_rooms r
    WHERE r.id = ((regexp_match(realtime.topic(), '^credichat-live-([0-9a-f-]{36})$'))[1])::uuid
      AND r.status = 'live'
  )
);

DROP POLICY IF EXISTS credichat_live_broadcast_write ON realtime.messages;
CREATE POLICY credichat_live_broadcast_write
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  extension = 'broadcast'
  AND EXISTS (
    SELECT 1
    FROM public.chat_live_rooms r
    WHERE r.id = ((regexp_match(realtime.topic(), '^credichat-live-([0-9a-f-]{36})$'))[1])::uuid
      AND r.status = 'live'
  )
);

DROP POLICY IF EXISTS credichat_live_presence_read ON realtime.messages;
CREATE POLICY credichat_live_presence_read
ON realtime.messages FOR SELECT TO authenticated
USING (
  extension = 'presence'
  AND EXISTS (
    SELECT 1
    FROM public.chat_live_rooms r
    WHERE r.id = ((regexp_match(realtime.topic(), '^credichat-live-([0-9a-f-]{36})$'))[1])::uuid
      AND r.status = 'live'
  )
);

DROP POLICY IF EXISTS credichat_live_presence_write ON realtime.messages;
CREATE POLICY credichat_live_presence_write
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  extension = 'presence'
  AND EXISTS (
    SELECT 1
    FROM public.chat_live_rooms r
    WHERE r.id = ((regexp_match(realtime.topic(), '^credichat-live-([0-9a-f-]{36})$'))[1])::uuid
      AND r.status = 'live'
  )
);

CREATE OR REPLACE FUNCTION public.broadcast_credichat_live_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'credichat-live-' || new.room_id::text,
    'message',
    'INSERT',
    new,
    null
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_credichat_live_message ON public.chat_live_messages;
CREATE TRIGGER trg_broadcast_credichat_live_message
AFTER INSERT ON public.chat_live_messages
FOR EACH ROW EXECUTE FUNCTION public.broadcast_credichat_live_message();

COMMIT;
