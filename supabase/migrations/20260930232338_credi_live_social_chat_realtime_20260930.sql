-- Only adjust the already-existing chat_live_messages table here.
-- Reactions, moderators and blocked keywords are created by the later
-- 20261104040200_restore_credi_live_commerce_schema migration. Their indexes,
-- policies and Realtime publication are configured after those tables exist.
ALTER TABLE public.chat_live_messages
  DROP CONSTRAINT IF EXISTS chat_live_messages_body_check;

ALTER TABLE public.chat_live_messages
  ADD CONSTRAINT chat_live_messages_body_check
  CHECK (char_length(btrim(body)) BETWEEN 1 AND 500);

CREATE INDEX IF NOT EXISTS idx_chat_live_messages_room_created
  ON public.chat_live_messages(room_id, created_at DESC);

DO $publication$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname='supabase_realtime'
         AND schemaname='public'
         AND tablename='chat_live_messages'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_live_messages;
  END IF;
END
$publication$;
