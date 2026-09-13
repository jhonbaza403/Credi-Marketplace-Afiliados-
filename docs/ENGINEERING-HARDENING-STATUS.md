# Credi Marketplace — Engineering Hardening Status

Fecha de referencia: 2026-09-13

## Arquitectura objetivo

Credi permanece como un modular monolith sobre Next.js/TypeScript/Vercel con Supabase/PostgreSQL, RLS/RPC, Zod, Stripe y Coinbase Business. Prisma, Kubernetes y una descomposición prematura en microservicios no forman parte del baseline.

## Implementado

- `main` como baseline de producción.
- `develop` creado como línea de integración.
- Constitución técnica y workflow de desarrollo documentados.
- Cliente privilegiado de Supabase unificado en `admin.ts`; `service.ts` es un shim deprecado.
- RLS habilitado en 125/125 tablas públicas auditadas en la comprobación actual.
- Índices críticos de orders/payments/tax/settlement.
- Rate limiting distribuido mediante RPC atómico de Supabase.
- OAuth token endpoint con Zod y PKCE S256 centralizado conforme a RFC 7636.
- Registro de webhooks limitado a HTTPS con validación DNS/IP contra loopback, redes privadas, link-local y metadata.
- Sanitización centralizada de filtros PostgREST.
- Tax & Fiscal Engine con snapshot versionado.
- Settlement allocations separadas por beneficiario/concepto.
- Stripe/Coinbase webhook-driven payment state.
- Tests unitarios de seguridad, PKCE, filtros y SSRF.
- Redirects de compatibilidad hacia rutas canónicas para aliases legacy conocidos.

## Pendientes que requieren acceso/acción externa

1. GitHub: proteger `main` con PR obligatorio, checks requeridos, branch protection y prohibición de push directo.
2. Vercel: confirmar Production/Preview environments, approvals y política de rollback desde la consola del proyecto.
3. Supabase: ejecutar y documentar una restauración real de backup en un entorno aislado y establecer RPO/RTO.
4. Coinbase/Stripe: validar webhooks con eventos reales de una cuenta de producción antes de activar entregas finales.

## Consolidación posterior

- Inventario y adaptación archivo por archivo de todos los Route Handlers.
- Sustitución progresiva de `any` por `unknown`/schemas.
- División de los God Routes/God Components.
- Migración de consumidores restantes desde el shim `service.ts`.
- Auditoría detallada de foreign keys, constraints, triggers, policies e índices.
- Consolidación de migraciones mediante un baseline `schema-v1` sin borrar el historial existente.
- Ampliación de integration/E2E tests para Commerce, Orders, Payments, Affiliate, B2B, Disputes, Webhooks y RLS.
- Multi-tenancy `organization/workspace/members/roles` cuando el producto empresarial lo requiera.

## Regla operativa

La interfaz nunca determina un estado financiero. Los eventos verificables del backend/proveedor son los que producen cambios financieros. La IA recomienda; el dominio, compliance, riesgo y políticas autorizan acciones.
