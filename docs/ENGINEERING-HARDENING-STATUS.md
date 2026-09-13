# Credi Marketplace — Engineering Hardening Status

Fecha de referencia: 2026-09-13

## Objetivo

Convertir el producto existente en un modular monolith preparado para crecer sin introducir Prisma, microservicios ni una segunda fuente de verdad de datos.

## Completado en código y base de datos

- `main` continúa como rama de producción.
- `develop` existe como rama de desarrollo y se sincroniza con el baseline endurecido.
- Supabase/PostgreSQL sigue siendo la fuente de verdad.
- RLS activo en las 125 tablas públicas auditadas; ninguna quedó sin RLS en la comprobación actual.
- Cliente privilegiado unificado en `src/lib/supabase/admin.ts`; `service.ts` permanece únicamente como shim de compatibilidad deprecado.
- Índices críticos para órdenes, pagos, fiscalidad y settlement.
- Rate limiting distribuido mediante RPC atómico de Supabase.
- PKCE OAuth S256 conforme a RFC 7636 mediante helper centralizado.
- Validación Zod del token endpoint y registro de webhooks.
- Registro de webhooks restringido a HTTPS y validación DNS/IP contra destinos privados, loopback, link-local y metadata.
- Sanitización centralizada de filtros PostgREST para búsquedas.
- Tax & Fiscal Engine versionado con snapshots históricos y separación de allocations.
- Stripe y Coinbase Business mantienen webhook-driven settlement.
- Tests unitarios para PKCE, búsquedas seguras y SSRF.

## Todavía requiere una acción externa o una etapa posterior

### Administración de repositorio

- Activar protección de `main`: PR requerido, checks obligatorios, branch up-to-date y prohibición de push directo.
- Configurar Preview/Production environments y aprobación de despliegue en Vercel.

### Recuperación ante desastres

- Verificar backup/restauración desde Supabase con una restauración real en entorno aislado.
- Definir RPO/RTO y ejecutar una prueba periódica documentada.

### Consolidación P1/P2

- Inventario archivo por archivo de las 76 APIs y aplicación uniforme de auth, autorización, Zod, rate limiting, idempotencia, logging y manejo de errores.
- Consolidación progresiva de rutas legacy usando redirects; no borrar implementaciones hasta confirmar consumidores.
- Reducción sistemática de `any`.
- División de God Routes/God Components.
- Pirámide completa de tests para Commerce, Orders, Payments, Affiliate, B2B, Disputes, Webhooks y RLS.
- Revisión de todas las dependencias antes de retirarlas.
- Auditoría completa de índices, foreign keys, constraints, triggers y policies con una posterior línea base `schema-v1`.

## Principios de arquitectura

1. Next.js + TypeScript + Supabase/PostgreSQL + RLS/RPC + Zod.
2. Un modular monolith antes que microservicios.
3. La UI nunca determina el estado financiero.
4. Los webhooks son la fuente verificable del estado de pagos externos.
5. La IA recomienda; el dominio, compliance, riesgo y políticas deciden.
6. Credi no añade Prisma salvo que una evidencia técnica futura lo justifique.
7. Toda nueva capacidad debe integrarse en el dominio existente antes de crear otra capa paralela.
