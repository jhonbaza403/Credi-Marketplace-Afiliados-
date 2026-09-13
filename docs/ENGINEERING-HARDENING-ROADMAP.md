# Credi Marketplace — Engineering Hardening Roadmap

This roadmap converts the architectural audit into executable engineering priorities.

## Stage I — Hardening (current)

Status: IN PROGRESS

### Completed in this hardening pass

- `main` remains the production line.
- `develop` exists for integration work.
- Architecture Constitution added.
- Privileged Supabase client path is converged through `admin.ts`; `service.ts` is only a deprecation shim.
- Request/trace context helper added.
- Existing rate-limit abstraction retained as the project boundary for future distributed stores.
- Financial smoke test replaced with meaningful assertions for payment rails and tax arithmetic.
- Tax & Fiscal Engine separated from payments.
- Coinbase Business Checkout integration uses server-only credentials.

### P0 controls still requiring progressive rollout

- Review every public Route Handler for auth, authorization, input validation, rate limiting, idempotency, logging and bounded errors.
- Verify RLS policies for every user-owned financial/commercial table.
- Verify webhook signature and duplicate-event handling for every external provider.
- Inventory and eliminate legacy environment variables after production consumers are migrated.
- Verify database backups and perform restoration drills outside the production database.
- Complete OAuth PKCE S256 verification and webhook SSRF validation before opening developer APIs broadly.
- Introduce one approved PostgREST search service with controlled operators and input length.

## Stage II — Consolidation

- Canonicalize duplicate routes with redirects.
- Split God Routes and God Components into domain/application services.
- Remove unused dependencies only after repository-wide consumer verification.
- Reduce `any` in API/domain code in favor of `unknown` plus Zod contracts.
- Consolidate migration history only through a controlled schema freeze; never delete historical Git evidence.

## Stage III — Reliability

Critical automated scenarios:

- auth and authorization boundaries;
- product → cart → order;
- order → payment intent → provider → webhook → paid;
- webhook replay/idempotency;
- affiliate attribution → commission → settlement;
- B2B RFQ → quote → award → order;
- dispute lifecycle;
- RLS cross-user isolation;
- tax snapshot stability;
- seller/admin/buyer privilege separation.

## Stage IV — Scale

### 1,000 users

Prioritize database indexes, RLS, API limits, payment correctness and actionable logs.

### 10,000 users

Measure hot queries, add safe caching and background jobs for long-running work.

### 100,000 users

Use queue-backed processing for asynchronous workloads, optimize database access and formalize service-level metrics.

### 1,000,000+ users

Consider read replicas, dedicated search, distributed queues and independent services only where measured bottlenecks justify them.

## Operating principle

`Correctness → Security → Observability → Testability → Performance → Scale`

New features should not outrun these foundations.
