# Credi Marketplace — Auditoría 360°

## Objetivo
Establecer gates verificables para estabilidad, seguridad, datos, pruebas, rendimiento y despliegue. Una configuración declarativa no equivale a una verificación real.

## Gates
1. Repository contract — Node 24/npm 11, lockfile and required files.
2. Route audit — pages/API inventory, missing references and duplicate canonical routes.
3. Environment contract — source-level environment variables must be represented in .env.example or explicitly allowlisted.
4. Static security — CodeQL, secret scanning, dependency review and npm audit.
5. API security — shared auth/RBAC/rate-limit primitives and route matrix.
6. Database security — RLS, SECURITY DEFINER and function grants.
7. Testing — unit, integration, E2E and production build.
8. Vercel — deployment status, build logs, runtime errors and project configuration must come from the actual Vercel project.
9. Performance — route caching classification and real-world metrics where available.

## Non-negotiable rule
A gate is PASS only when evidence exists. Pending, unavailable, inferred or undocumented is not PASS.

## Remediation branch
vercel-ready is the integration branch for this audit. It must not be merged to main until CI and the connected Vercel deployment both report success.