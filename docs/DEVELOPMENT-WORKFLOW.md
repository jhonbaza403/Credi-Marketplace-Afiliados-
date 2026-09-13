# Credi Marketplace — Development Workflow

## Branches

- `main`: production baseline. Do not use for experimental work.
- `develop`: integration and validation branch for the next release.
- `feature/*`: isolated changes created from `develop`.

## Required path

`feature/*` → `develop` → Vercel Preview/CI → `main`

## Production rule

A change is production-ready only after automated validation covers the affected domain and the Vercel Preview is healthy. Financial, security, database and migration changes require explicit review before promotion.

## Rollback

Every production deployment must remain revertible to a known-good commit. Database migrations must be backward-conscious and must not use destructive changes without a recovery plan.
