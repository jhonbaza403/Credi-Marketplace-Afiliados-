# Credi Marketplace — Architecture Constitution

Version: 1.0
Status: ACTIVE

## 1. Source of truth

- PostgreSQL/Supabase is the canonical transactional data store.
- RLS and database constraints are authoritative for data access and integrity.
- RPCs are used for atomic financial/domain operations where concurrency matters.
- TypeScript services must not silently become a second source of truth for persisted business rules.

## 2. Runtime

- Production runtime: Vercel + Next.js.
- Primary application architecture: modular monolith.
- No Prisma/Drizzle/second ORM without an explicit architecture decision.
- No microservices, Kubernetes, Kafka or Redis cluster merely for anticipated scale.

## 3. Environments

- `main` is the protected production line.
- `develop` is the integration line for non-production changes.
- Material changes should move through Vercel Preview before production.
- Production rollback must remain possible for every deploy.

## 4. Domains

Core domains are:

- Commerce
- Orders
- Payments
- Settlement
- Taxation
- Affiliate
- B2B
- Services
- Identity
- Compliance
- Reputation
- Intelligence
- Developer Platform

Each domain should expose clear types, validation, application services, persistence/RPC boundaries, API contracts and tests.

## 5. Request flow

Every public Route Handler should follow:

`HTTP → validation → authentication → authorization → rate limit → application service → domain/RPC → audit/observability → response`

Route Handlers must remain thin. Business logic belongs in domain/application services.

## 6. Financial invariants

The browser never determines financial truth.

Canonical flow:

`Order → Payment Intent → Provider → verified Webhook → idempotency → Ledger/Settlement → Order state → Commission → Payout`

A redirect or client-side success message is never sufficient evidence of payment.

## 7. Taxation

Taxation is a separate engine from payments.

Every tax calculation that is persisted must retain a snapshot of the applicable jurisdiction/rule/rate/model at transaction time.

Do not load unverified global tax rates into production.

## 8. Identity and authorization

- Authentication identifies the principal.
- Authorization decides what the principal may do.
- Ownership checks are mandatory for user-scoped resources.
- `user_id` alone is not the long-term enterprise tenancy model; organization/workspace support must be additive and explicit.

## 9. Secrets

- Secrets are server-only.
- Never commit provider secrets, private keys, webhook secrets or service-role keys.
- Environment names must have one canonical contract; legacy aliases may exist only during controlled migration.

## 10. Webhooks

External webhooks must:

- verify authenticity/signature;
- reject stale/replayed events when the provider specifies a timestamp/signature model;
- deduplicate event IDs where available;
- validate provider references and amounts;
- be idempotent;
- produce auditable outcome metadata.

## 11. Search and external URLs

- User input must not be interpolated directly into PostgREST filter expressions without sanitization.
- Outbound webhook delivery must validate destination URLs and block private/link-local targets to mitigate SSRF.

## 12. AI

`AI ≠ authority`.

AI may recommend, rank, summarize or predict. Domain policies, compliance and transaction rules remain authoritative.

## 13. Testing

Required confidence layers:

`Unit → Domain/Integration → API → E2E`

Critical invariants must have automated tests, especially:

- ownership/RLS;
- order totals;
- affiliate attribution/commission;
- payment idempotency;
- webhook deduplication;
- settlement allocations;
- tax snapshots.

## 14. Observability

Important operations should carry:

- request_id
- trace_id
- user_id
- tenant_id when applicable
- order_id
- payment_id/event_id when applicable
- operation
- provider
- duration
- outcome/error code

Never log private keys, secrets, full authentication tokens or sensitive payment credentials.

## 15. Database evolution

- All schema changes use migrations.
- Never edit production schema ad hoc without capturing the change in versioned migration history.
- Before schema consolidation: backup → staging/dev validation → migration test → RLS/constraint test → production.
- Historical migration files remain in Git even after consolidation planning.

## 16. Compatibility and deprecation

Use lifecycle labels:

- ACTIVE
- BETA
- EXPERIMENTAL
- DEPRECATED
- INTERNAL

Do not delete an apparently unused feature solely from static inspection; establish its consumers and migration path first.

## 17. Growth strategy

### 1,000 users
Focus on correctness, indexing, RLS, rate limits and logs.

### 10,000 users
Add query profiling, stronger API throttling, caching of safe read models and background jobs where justified.

### 100,000 users
Measure hot paths, queue long-running work, optimize database access and introduce event-oriented processing only where metrics justify it.

### 1,000,000+ users
Evaluate read replicas, dedicated search, distributed queues, independent services and additional infrastructure based on measured bottlenecks.

## 18. Forbidden architectural shortcuts

- No client-authoritative payment status.
- No privileged Supabase client in Client Components.
- No duplicate ORM/source-of-truth layers without an approved decision.
- No secrets in source control.
- No unverified tax rates presented as legal truth.
- No external URL fetches without SSRF controls.

This document is the governing technical contract for future Credi Marketplace changes.
