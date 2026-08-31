````markdown
# Credi Marketplace — Build Verification

## Verification Status

This document records the verification status of the Credi Marketplace
source tree and project configuration.

The verification performed after the Supabase and module fixes included
source-code, import-resolution, configuration, and project-structure checks.

> **Important:** Static verification does not constitute proof of a successful
> production build. A successful production build must be confirmed by
> executing `npm run build` in an environment where all dependencies can be
> installed successfully.

---

## Runtime Target

The project is currently aligned with the following runtime:

| Component | Target |
|---|---|
| Node.js | 24.20.0 LTS |
| npm | 11.x |
| Next.js | 16.3.3 |
| React | 19.2.8 |
| TypeScript | 7.0.2 |
| Tailwind CSS | 4.3.3 |

The Node.js and npm versions must remain consistent across local development,
CI/CD, and production environments whenever possible.

---

# Source Tree Verification

The source tree was inspected after the Supabase and module configuration
updates.

The following checks were performed:

- TypeScript and TSX source files were inspected for syntax/transpilation
  compatibility.
- `@/` path aliases were checked against the configured TypeScript alias.
- Import targets under `src/` were checked for existing files or directories.
- Supabase client/server boundaries were reviewed.
- Project configuration files were checked for structural consistency.
- Next.js App Router files were reviewed for module import/export consistency.

---

# TypeScript / TSX Verification

A static TypeScript transpilation/syntax verification was performed against:

```text
214 TypeScript/TSX files
````

The files passed the static TypeScript transpile/syntax check performed during
the verification process.

This check validates source syntax and transpilation compatibility.

It does **not** replace:

```bash
npm run typecheck
```

and does not guarantee that the complete Next.js production build will pass.

---

# Import Resolution

The `@/` alias is configured to resolve from:

```text
src/
```

The project configuration uses:

```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

The verification confirmed that the inspected `@/` import targets in `src/`
resolve to existing files or directories.

Example:

```tsx
import AdminDashboard from "@/components/admin/AdminDashboard";
```

resolves to:

```text
src/components/admin/AdminDashboard.tsx
```

Import/export style must remain consistent.

For a default export:

```tsx
export default function AdminDashboard() {}
```

the import must be:

```tsx
import AdminDashboard from "@/components/admin/AdminDashboard";
```

For a named export:

```tsx
export function AdminDashboard() {}
```

the import must be:

```tsx
import { AdminDashboard } from "@/components/admin/AdminDashboard";
```

These two forms must not be mixed accidentally.

---

# Supabase Browser Client

Browser-side Supabase access uses the public client configuration.

The browser client must use:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

The publishable key is intended for client-side use according to the
Supabase project configuration.

Secret server credentials must never be exposed through `NEXT_PUBLIC_`
environment variables.

---

# Supabase Server Client

Server-side Supabase access uses the server factory located at:

```text
src/lib/supabase/server.ts
```

Server-side code is responsible for operations that require:

* authenticated sessions;
* server-side authorization;
* protected database access;
* privileged operations where explicitly required;
* secure handling of server-only environment variables.

The server implementation must not expose secret credentials to Client
Components or browser bundles.

---

# Supabase Security

Protected database operations must remain subject to appropriate Supabase
Row Level Security policies.

The application must not rely exclusively on frontend checks for security.

The expected security model is:

```text
User
  ↓
Authentication
  ↓
Server-side Authorization
  ↓
API / Server Logic
  ↓
Supabase
  ↓
Row Level Security
  ↓
PostgreSQL
```

---

# Administrative Routes

Administrative routes must be protected server-side.

Relevant routes include:

```text
src/app/admin/
src/app/dashboard/admin/
```

Administrative pages should use the authorization guard:

```tsx
await requireAdmin();
```

The presence or absence of an administrative button in the frontend is not
considered a security control.

---

# Environment Configuration

The project distinguishes between public and server-only environment
variables.

Public configuration may include:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
NEXT_PUBLIC_DEFAULT_LOCALE
NEXT_PUBLIC_DEFAULT_CURRENCY
NEXT_PUBLIC_DEFAULT_COUNTRY
NEXT_PUBLIC_ENV
```

Server-only configuration may include:

```text
SUPABASE_SECRET_KEY
SUPABASE_JWKS_URL
DATABASE_URL
GEMINI_API_KEY
```

Server-only secrets must never use the:

```text
NEXT_PUBLIC_
```

prefix.

---

# Package Installation

A reproducible installation requires a valid:

```text
package-lock.json
```

When the lockfile already exists and matches `package.json`, CI should use:

```bash
npm ci
```

When generating the lockfile for the first time:

```bash
npm install
```

After the lockfile has been generated, it should be committed to the
repository and used by CI/CD.

The lockfile must not be manually edited.

---

# Required Quality Gates

The project defines the following verification commands:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run security:audit
```

A production release should not be considered verified until the applicable
quality gates complete successfully.

---

# Production Build Verification

The definitive production build command is:

```bash
npm run build
```

A successful production verification requires the command to finish without
Next.js, TypeScript, module resolution, configuration, or compilation errors.

A static source inspection or transpilation test must not be described as a
successful production build.

---

# Build Verification Limitation

During the preparation/verification process, a complete:

```bash
npm run build
```

was not successfully executed because dependency installation was blocked by
an npm registry/network timeout.

Therefore:

> **No successful production build is claimed by this document unless a real
> `npm run build` execution has completed successfully.**

This distinction is intentional and prevents a static verification result from
being incorrectly represented as production-build validation.

---

# CI/CD Verification

The preferred CI/CD sequence is:

```text
Install dependencies
        ↓
npm run lint
        ↓
npm run typecheck
        ↓
npm run test
        ↓
npm run test:e2e
        ↓
npm run security:audit
        ↓
npm run build
```

A failed critical verification step should prevent the corresponding
production release.

---

# Verification Categories

The project distinguishes between the following verification levels.

## Level 1 — Source Verification

Checks include:

* syntax;
* TypeScript transpilation;
* TSX parsing;
* import paths;
* project structure.

## Level 2 — Static Quality Verification

Checks include:

```bash
npm run lint
npm run typecheck
```

## Level 3 — Automated Testing

Checks include:

```bash
npm run test
npm run test:e2e
```

## Level 4 — Security Verification

Checks include:

```bash
npm run security:audit
```

and application-specific security tests.

## Level 5 — Production Build

The final compilation check is:

```bash
npm run build
```

Only a completed Level 5 verification should be described as a successful
production build.

---

# Current Verification Statement

Based on the checks recorded in this document:

* 214 TypeScript/TSX files passed the static transpile/syntax verification
  performed during preparation.
* The inspected `@/` import targets resolve to existing files or directories.
* Supabase browser access is configured around the public publishable key.
* Supabase server access uses the server factory under
  `src/lib/supabase/server.ts`.
* Administrative routes are designed for server-side authorization.
* Public and server-only environment variables are separated.
* The project runtime target is Node.js 24.20.0 LTS with npm 11.x.
* The project targets Next.js 16.3.3, React 19.2.8, TypeScript 7.0.2, and
  Tailwind CSS 4.3.3.
* A successful production build is **not claimed** until `npm run build`
  completes successfully in an environment with dependencies installed.

---

# Verification Date

Last documented verification:

```text
2026
```

This document should be updated whenever significant changes are made to:

* Next.js;
* React;
* TypeScript;
* Node.js;
* Supabase;
* authentication;
* authorization;
* database migrations;
* build configuration;
* CI/CD;
* deployment infrastructure.

---

# Final Status

```text
SOURCE VERIFICATION       PASS
IMPORT VERIFICATION       PASS
SUPABASE STRUCTURE        PASS
RUNTIME CONFIGURATION     ALIGNED
PRODUCTION BUILD          NOT YET CONFIRMED
```

The final production status must only be changed to `PASS` after a real
production build has completed successfully:

```bash
npm run build
```

```

**Importante:** cambié específicamente la afirmación de **Node 22/npm 10** por **Node 24.20.0 LTS/npm 11.x**, para que este documento no contradiga el `package.json`, `.nvmrc` y la configuración que estás estableciendo ahora.

El siguiente paso más útil es hacer que `tests/verify-structure.mjs` compruebe también **Node/npm, exports/imports administrativos, archivos `.env`, Supabase y la estructura de pruebas**, para que parte de esta verificación deje de ser manual.
```
