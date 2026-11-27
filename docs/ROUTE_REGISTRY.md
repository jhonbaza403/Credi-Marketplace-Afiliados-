# Credi Marketplace — canonical route registry

Last reviewed: 2026-11-27  
Source branch: `fix/credi-002-003-pgatap-wallet-ci-20261126`

This registry records the canonical destinations evidenced by the current Next.js App Router source and `next.config.ts`. It is not a claim that every route has passed authorization/E2E testing. Route authorization must be verified in the server page, server action, API handler and database RLS independently.

## Canonical public and commercial routes

| Module | Canonical route | Legacy route(s) | Access contract | Evidence / status |
|---|---|---|---|---|
| Home | `/` | `/inicio` | Public | Canonical page exists; permanent redirect configured |
| Social feed | `/social` | `/muro` | Public read; authenticated actions must enforce identity | Canonical page exists; permanent redirect configured |
| Marketplace | `/marketplace` | `/explorar` | Public browse; authenticated checkout/publish actions | Canonical destination configured |
| Sellers directory | `/sellers` | `/seller` | Public directory of verified businesses | `src/app/(public)/sellers/page.tsx`; permanent redirect configured |
| B2B marketplace | `/b2b` | `/seller/b2b` | Public browse; authenticated publish/order actions | `src/app/(public)/b2b/page.tsx`; legacy route page redirects; permanent redirects configured |
| B2B publishing | `/b2b/publish` | `/seller/b2b/publish` | Authenticated user; seller authorization and ownership enforced server-side | Page checks authenticated user; verify seller entitlement in E2E |
| Services and jobs directory | `/services` | `/jobs`, `/servicios` | Public browse; authenticated application/contact actions | `src/app/(public)/services/page.tsx`; permanent redirects configured for legacy aliases |
| Marketing Studio | `/marketing` | `/ads`, `/publicidad` | Authenticated; campaign ownership and role checks required | `src/app/marketing/page.tsx` checks authentication; admin/merchant entitlement requires E2E |
| Products | `/products` | `/productos` | Public browse; mutations require owner/seller authorization | Canonical redirect configured |
| Seller workspace | `/dashboard` and `/dashboard/b2b` | No legacy alias declared | Authenticated; seller/admin role checks | Dashboard modules exist; test route-by-route authorization |
| LIVE | `/live` | None declared | Public viewing; authenticated host actions and room ownership | Page exists; LIVE provider integration not certified by this registry |

## Permanent redirects

The following aliases are permanent (HTTP 308 in Next.js redirect configuration):
- `/inicio` → `/`
- `/muro` → `/social`
- `/seller` → `/sellers`
- `/seller/b2b` → `/b2b`
- `/seller/b2b/:path*` → `/b2b/:path*`
- `/jobs` and `/jobs/:path*` → `/services` and `/services/:path*`
- `/servicios` and `/servicios/:path*` → `/services` and `/services/:path*`
- `/explorar` → `/marketplace`
- `/productos` and `/productos/:path*` → `/products` and `/products/:path*`
- `/ads`, `/publicidad` → `/marketing`

Next.js permanent redirects normally produce HTTP 308, not 301. This preserves request method semantics and is preferred for App Router redirects; do not label these as literal HTTP 301.

## Authorization contract

- Public page visibility is not permission to mutate records.
- Every write API/RPC must validate the caller's JWT, role, ownership and resource state on the server.
- RLS remains the final data-access boundary; middleware/navigation visibility is not a substitute.
- Authenticated dashboard routes must reject anonymous users and redirect to login with a safe same-origin `next` path.
- Seller-only routes must verify seller ownership/entitlement from trusted database state, not client-supplied role metadata.
- Admin and `platform_owner` operations must use explicit server-side authorization and negative tests for ordinary authenticated users.
- Stripe webhooks and provider callbacks authenticate by signature/secret, not browser session.
- LIVE host operations must verify room ownership and provider credentials server-side.

## Middleware status and outstanding verification

A root-level `middleware.ts` was not found at the current branch source path during this audit. No new middleware was fabricated because a global redirect/role middleware can break Next.js route handlers and Server Component auth flows if it duplicates or conflicts with the existing Supabase SSR session refresh mechanism.

Before adding middleware:
1. Identify the active Supabase SSR session-refresh entrypoint and its matcher.
2. Enumerate protected route groups and role sources.
3. Add middleware checks only for coarse navigation redirects; retain server-side checks in pages/actions/APIs and RLS.
4. Add Playwright tests for anonymous, authenticated non-seller, seller, admin and platform-owner cases.

## Required CI route certification

For every canonical route above, Playwright should verify:
- expected HTTP status and redirect destination;
- no redirect loops;
- anonymous vs authenticated access;
- role/ownership denial for unauthorized mutations;
- no cross-tenant record visibility;
- CSP console errors for Stripe, LiveKit and Cloudflare Stream on their relevant pages.

This registry is a living contract. A route may only be marked certified after the test name, CI run URL, commit SHA and observed result are recorded here.
