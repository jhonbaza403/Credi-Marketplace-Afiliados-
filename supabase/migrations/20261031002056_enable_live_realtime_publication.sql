-- Enable Realtime row-change delivery for Credi LIVE room and product state.
DO $publication$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_live_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_live_rooms;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_live_products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_live_products;
  END IF;
END
$publication$;
