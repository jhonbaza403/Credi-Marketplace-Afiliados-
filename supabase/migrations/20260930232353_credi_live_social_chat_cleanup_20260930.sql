-- The message/reaction indexes are transitional and may not yet exist.
-- The reactions table/policy is installed later by the LIVE commerce schema migration.
DROP INDEX IF EXISTS public.idx_chat_live_messages_room_created;
DROP INDEX IF EXISTS public.idx_chat_live_reactions_room_created;
