# Credi Marketplace — Engineering Hardening Status

Fecha de referencia: 2026-09-13

Credi permanece como un modular monolith sobre Next.js/TypeScript/Vercel + Supabase/PostgreSQL, RLS/RPC y Zod. Prisma, Kubernetes y microservicios prematuros quedan fuera del baseline.

## Implementado

- `main` = production baseline; `develop` = integration baseline.
- Workflow `feature/* → develop → Preview/CI → main` documentado.
- Acceso privilegiado de Supabase consolidado en `admin.ts`; `service.ts` es shim deprecado.
- RLS comprobado en 125/125 tablas públicas actuales.
- Índices críticos de orders, payments, taxation y settlement.
- Rate limiting distribuido mediante RPC atómico en PostgreSQL.
- OAuth token endpoint con Zod y PKCE S256 centralizado.
- Registro de webhooks restringido a HTTPS con validación DNS/IP anti-SSRF.
- Sanitización centralizada de filtros PostgREST.
- Tax & Fiscal Engine versionado con snapshots y settlement allocations.
- Stripe/Coinbase con estados financieros gobernados por webhook.
- Tests de regresión para PKCE, SSRF y filtros.
- Redirects de aliases legacy conocidos hacia rutas canónicas.
- Documentación de arquitectura y hardening.

## No ejecutable desde esta conexión

- Activar branch protection y required checks en GitHub.
- Configurar approvals/protection definitivos de Production y Preview en Vercel.
- Ejecutar un restore real de backup y certificar RPO/RTO en Supabase.
- Certificar pagos reales de Coinbase/Stripe en cuentas productivas.

## Siguiente lote de ingeniería

- Aplicar un API guard común a todos los Route Handlers.
- Migrar consumidores restantes desde el shim `service.ts` y retirarlo.
- Sustituir progresivamente `any` por `unknown` + Zod.
- Dividir las rutas/componentes gigantes.
- Auditoría completa de FK, constraints, triggers, policies e índices.
- Baseline `schema-v1` solamente después de un restore probado.
- Ampliar integration/E2E: Commerce, Orders, Payments, Affiliate, B2B, Disputes, Webhooks y RLS.
