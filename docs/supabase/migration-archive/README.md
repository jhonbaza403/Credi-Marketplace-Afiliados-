# Supabase migration source archive

These SQL sources are preserved here because their effects are already represented by later migrations applied to the Production project. They are intentionally outside `supabase/migrations/` so the deployment runner will not treat them as new pending versions.

- `20261012080000_guard_social_moderation_fields.sql.disabled` is superseded by the applied Production migration `20261031002051_guard_social_moderation_fields.sql`. Production's current trigger function was inspected before moving the older source.
- `20261012150000_enable_live_realtime_publication.sql.disabled` is superseded by the applied Production migration `20261031002056_enable_live_realtime_publication.sql`. The Production Realtime publication already contains `chat_live_rooms` and `chat_live_products`.

The source SQL is retained verbatim. Do not restore these files as executable migrations; create a new timestamped migration for any future change.
