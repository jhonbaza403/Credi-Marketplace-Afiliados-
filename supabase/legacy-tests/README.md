# Supabase legacy SQL checks

These files are preserved for traceability after being moved outside the Supabase CLI's automatic test-discovery directory.

The legacy scripts are procedural/manual SQL checks, not pgTAP tests. Several contain old table or column assumptions and have not been certified against the current schema.

- Original relative paths are preserved under `supabase/legacy-tests/tests/`.
- These files are excluded from automated `supabase test db` execution.
- Do not execute them against hosted Production or Preview.
- Rewrite each useful check as an isolated pgTAP test after verifying its current schema and authorization contract.

Only pgTAP tests with explicit plans and assertions belong under `supabase/tests/`.
