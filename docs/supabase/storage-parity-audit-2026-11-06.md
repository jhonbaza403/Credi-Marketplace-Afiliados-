# Supabase Storage parity audit

Date: 2026-11-06 (America/Chicago)  
Scope: read-only inspection of Production and Preview Storage metadata, plus source review on PR #103. No remote SQL was applied, no objects were read or changed, and no Edge Function was deployed.

## Live bucket inventory

Projects:
- Production: `fusnmvmveqdzmzohhlzm`
- Preview: `yjxybhpubxhblfyfzlmk`

| Bucket | Production | Preview | Required contract |
|---|---|---|---|
| `marketplace-media` | Present, public, 500 MiB | Missing | Public; 500 MiB; configured image, video and audio MIME types |
| `kyc-documents` | Present, private, 10 MiB | Missing | Private; 10 MiB; JPEG, PNG, WebP, PDF |
| `kyb-documents` | Present, private, 10 MiB | Missing | Private; 10 MiB; JPEG, PNG, WebP, PDF |
| `credichat-private` | Present, private, 500 MiB | Present, private, 500 MiB | Matching private-chat bucket |
| `identity-profile-private` | Present, private, 15 MiB | Present, private, 15 MiB | Matching private identity-photo bucket |

The inspected `storage.objects` policy set contains the owner-scoped insert policy for `credichat-private` in both projects. Compliance uploads/downloads use server-side service-role operations; marketplace uploads use the signed-upload flow. This patch therefore does not add broad client write policies to `storage.objects`.

## Demonstrable application impact

- `src/app/api/compliance/upload/route.ts` writes KYC documents to `kyc-documents` and KYB documents to `kyb-documents`. Those buckets are absent in Preview, so this route cannot complete there until the bucket contract is provisioned.
- `src/app/api/compliance/document/route.ts` creates signed reads from the same private buckets.
- `src/lib/storage/marketplace-media.ts` uses `marketplace-media` for public media uploads. The bucket is absent in Preview.
- The repository's `media-upload` Edge Function had a MIME allow-list defect: its general allow-list included audio, but the marketplace-context allow-list used when validating/creating the bucket contained only image and video MIME types. That contradicted the client uploader and Production bucket contract, which support audio.

## Changes prepared on this PR branch

1. Added `20261107021305_provision_compliance_and_marketplace_storage_buckets.sql`.
   - Inserts only missing bucket rows.
   - Never updates or deletes an existing bucket or object.
   - Checks the resulting visibility, size and MIME contract and aborts if an existing bucket differs.
   - Keeps KYC/KYB private and marketplace media public.
2. Added `supabase/tests/storage-buckets.test.sql` with 12 pgTAP assertions for existence, visibility, size limits and MIME sets.
3. Extracted the media upload MIME contract to `supabase/functions/_shared/media-upload-policy.ts`.
4. Corrected `media-upload` to use the shared policy, so marketplace audio types accepted by the client are also accepted by the Edge Function.
5. Added Deno tests for marketplace image/video/audio support and private-chat PDF/media support.
6. Restored the migration-catalog audit step in CI and added a free GitHub Actions job that starts an isolated local Supabase/PostgreSQL stack, applies the complete migration catalog with `supabase db reset --local`, and runs pgTAP tests. This is local CI only; it does not connect to either hosted project.

## Remaining blockers / safeguards

- The migration and tests are committed only to the PR branch. They have not been applied to Preview or Production.
- Production currently has three Edge Functions (`health`, `media-upload` v9, `kyc-upload` v1); Preview currently has only `media-upload` v1. No function was deployed by this audit. The code/configuration parity must be validated before a separately approved Preview deployment.
- The private-chat plan-quota check in `media-upload` uses the client-supplied `fileSize` before issuing a signed upload URL. The Storage bucket limit caps an individual upload at 500 MiB, but does not enforce each user's smaller plan quota. A client could under-report the size when requesting the URL. This needs a server-enforced post-upload or upload-proxy design before treating per-plan quota as a security boundary.
- The CI runner used for this audit did not provide local `psql`, PostgreSQL server binaries, Docker or Supabase CLI. The new GitHub Actions local-database job is therefore the authoritative pending validation for this change.
- No Production deployment, remote migration, Storage mutation, Edge Function deployment, data deletion, plan change or billing action was performed.

## Evidence

- Live bucket inventory was read from `storage.buckets` in both projects.
- Application references were checked in `src/app/api/compliance/upload/route.ts`, `src/app/api/compliance/document/route.ts` and `src/lib/storage/marketplace-media.ts`.
- The MIME mismatch was confirmed by comparing `supabase/functions/media-upload/index.ts` with the client uploader and Production's `marketplace-media` bucket MIME list.

## Local CI diagnostic — Supabase CLI compatibility

- First local-database workflow run `42328628933` failed at `supabase start` before Docker services or PostgreSQL migrations started. The exact CLI error was: `[inbucket] in supabase/config.toml is no longer supported. Use [local_smtp] instead.`
- Because startup failed, `supabase db reset --local` and `supabase test db --local` were skipped. No migration SQL ran and no hosted project was contacted.
- Kept the existing shared `supabase/config.toml` unchanged and pinned the CI-only Supabase CLI to `2.122.1` using `supabase/setup-cli@v3`, so this local test can run against the repository's current config without changing hosted project configuration.
- Retry is running on PR head `7a7f3b58dcc1ddb9cfc6513e70fc773442e1667a`: [Credi Marketplace CI run 2752](https://github.com/jhonbaza403/Credi-Marketplace-Afiliados-/actions/runs/42328770322). The local migration job has started; no result is claimed yet.
- References: [Supabase CLI v3 migration guide](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3) and [Supabase CLI v2.122.1 release](https://github.com/supabase/cli/releases/tag/v2.122.1).
