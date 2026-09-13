# Credi Marketplace — Engineering Hardening Status

Fecha de referencia: 2026-09-13

## Baseline

Credi remains a modular monolith on Next.js/TypeScript/Vercel with Supabase/PostgreSQL, RLS/RPC, Zod, Stripe and Coinbase Business. Prisma and premature microservices are intentionally excluded.

## Implemented

- Production baseline on `main` and development baseline on `develop`.
- Production/development workflow documented.
- Privileged Supabase access consolidated around `admin.ts`; `service.ts` is a compatibility shim.
- RLS verified on 125/125 public tables in the current database audit.
- Financial/tax/settlement indexes added.
- Atomic distributed rate limiter added to Supabase and exposed as a server utility.
- OAuth token endpoint hardened with Zod and RFC 7636 S256 PKCE helper.
- Developer webhook registration restricted to HTTPS and DNS/IP SSRF checks.
- PostgREST free-text search sanitization helper added.
- Tax & Fiscal Engine with immutable-style transaction snapshots and settlement allocations.
- Stripe/Coinbase payment settlement remains webhook-driven.
- Security regression tests added for PKCE, SSRF and search filtering.
- Legacy route aliases redirect to canonical routes without deleting existing implementations.
- Architecture and hardening status documented.

## External controls not executable from this code connection

- GitHub branch protection/required approvals on `main`.
- Vercel Production/Preview approval settings and deployment protection.
- Supabase backup restore drill, RPO/RTO validation.
- Live provider onboarding and real payment/webhook certification.

## Remaining engineering consolidation

- Apply a shared API guard contract to every Route Handler: authentication, authorization, schema validation, rate limit, idempotency where needed, request context and structured errors.
- Migrate remaining `service.ts` consumers directly to `admin.ts`, then remove the shim.
- Continue replacing `any` with `unknown` + Zod schemas.
- Split the largest God Routes/God Components.
- Audit all foreign keys, constraints, triggers, policies and indexes and produce `schema-v1` only after a tested restore path exists.
- Expand integration/E2E coverage for Commerce, Orders, Payments, Affiliate, B2B, Disputes, Webhooks and RLS.
- Add organization/workspace/members only when multi-tenant enterprise requirements become concrete.
