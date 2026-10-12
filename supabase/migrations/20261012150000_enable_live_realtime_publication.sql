-- Enable database change notifications for LIVE room state and pinned products.
-- Idempotent: safe to re-run if a table is already in supabase_realtime.
BEGIN;

DO $$
DECLARE
  v_table_name text;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY['chat_live_rooms', 'chat_live_products'] LOOP
    IF to_regclass(format('public.%I', v_table_name)) IS NOT NULL
      AND EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
      AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = v_table_name
      )
    THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table_name);
    END IF;
  END LOOP;
END
$$;

COMMIT;
