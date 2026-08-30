# Credi Marketplace — Exhaustive structural audit

## Corrected

- Canonical root package and `src/` architecture preserved.
- Node 24.20.0 / npm 11.19.0 contract fixed.
- Next.js 16.3.3 / React 19.2.8 / TypeScript 7.0.2 / Tailwind 4.3.3 aligned.
- Tailwind v3 configuration removed from the architecture; Tailwind v4 is CSS-first.
- Duplicate `src/features` domain layer removed after consolidating reusable code.
- Broken aliases in marketplace, affiliate and B2B code corrected.
- Supabase server client corrected to use the publishable key.
- Admin Supabase client uses the modern secret key first, with service-role fallback for compatibility.
- Authentication context and RBAC roles made internally consistent.
- `/admin` added to protected routing.
- Health, auth, products, sellers, recommendations and webhook readiness endpoints added.
- Dashboard and admin route structure completed with deploy-safe pages where business implementations were not yet present.
- Unit/integration/E2E test structure normalized.
- GitHub Actions quality and security gates normalized around `npm ci`.
- Vercel deployment kept native; OpenNext is not used.
- Non-source artefacts removed from the repository root.

## Deliberate external dependency

`package-lock.json` is not fabricated. It must be produced by npm 11 on Node 24 from this exact `package.json` and committed before CI runs.

## Final deployment invariant

`package.json` and `package-lock.json` must live in the repository root that Vercel uses as `/vercel/path0`.

## Validation performed in the available build environment

- ZIP extracted and inspected: 306 source/root files before consolidation.
- Final archive rebuilt after consolidation.
- Zero empty directories in final tree.
- Zero unresolved `@/` imports detected by static path audit.
- Zero legacy `@/features/*` imports remain.
- No `middleware.ts` remains; `src/proxy.ts` is the route interception entrypoint.
- Root `package.json` is present and parses as valid JSON.
- `tsconfig.json` parses as valid JSON.
- Structural verification script passes.

A full `npm ci`, ESLint, TypeScript, Playwright and Next build could not be executed here because the runtime container is Node 22/npm 10 and the npm registry is unreachable. Therefore the archive is structurally prepared, but the real npm lockfile still has to be generated with Node 24/npm 11 and committed.
