# Credi Marketplace — Development Workflow

## Branches

- `main`: production baseline.
- `develop`: integration and validation baseline.
- `feature/*`: isolated changes created from `develop`.

## Required path

`feature/*` → `develop` → Vercel Preview/CI → `main`

No experimental implementation should be developed directly on `main` after this baseline.

## Production rule

Production changes require successful automated checks and a healthy Vercel Preview. Financial, security, database and migration changes require explicit review before promotion.

## Rollback

Keep every production release tied to a known-good commit. Database migrations must be reversible or accompanied by a tested recovery procedure; destructive changes require an isolated restore test first.
