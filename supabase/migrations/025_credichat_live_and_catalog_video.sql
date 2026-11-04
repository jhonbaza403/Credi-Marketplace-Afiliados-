-- Legacy migration version 025 is already present in the remote migration history.
-- Its base chat LIVE tables, catalog video field, and conversation timestamp
-- trigger are preserved by:
--   20260910214720_025_credichat_live_and_catalog_video.sql
-- The additional Realtime authorization policies and message broadcast
-- trigger are preserved by:
--   20260910214721_credichat_live_realtime_broadcast.sql
--
-- Keep this historical version as an intentional no-op so clean local resets
-- do not reference public.conversations before its timestamped core migration.
BEGIN;
COMMIT;
