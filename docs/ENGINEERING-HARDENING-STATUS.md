# Credi Marketplace — Engineering Hardening Status

Fecha de referencia: 2026-09-13

Credi permanece como un modular monolith sobre Next.js/TypeScript/Vercel + Supabase/PostgreSQL, RLS/RPC y Zod. Prisma, Kubernetes y microservicios prematuros quedan fuera del baseline.

## Cerrado en código y base de datos

- `main` = production baseline; `develop` = integration baseline.
- Workflow `feature/* → develop → Preview/CI → main` documentado.
- Acceso privilegiado de Supabase centralizado en `admin.ts`; `service.ts` queda únicamente como shim temporal para compatibilidad de despliegue.
- RLS comprobado en 125/125 tablas públicas actuales.
- Auditoría de FK: 0 advertencias de foreign keys sin índice.
- Auditoría de índices: eliminados los 2 pares de índices duplicados detectados.
- Auditoría de políticas: eliminadas las políticas permisivas redundantes detectadas en media/social y separadas las operaciones de escritura.
- Rate limiting distribuido mediante RPC atómico en PostgreSQL.
- OAuth token endpoint con Zod y PKCE S256 centralizado.
- Webhooks restringidos a HTTPS con validación DNS/IP anti-SSRF.
- Sanitización centralizada de filtros PostgREST.
- Tax & Fiscal Engine versionado con snapshots y settlement allocations.
- Stripe/Coinbase con estados financieros gobernados por webhook.
- Tests de regresión para PKCE, SSRF y filtros.
- Redirects de aliases legacy conocidos hacia rutas canónicas.
- Tipado de Stripe subscription interval corregido para usar la estructura real de `price.recurring.interval`.
- Mapeo explícito de filas Supabase a `ProductSummary` sin casts inseguros.
- Migraciones de hardening de FK/RLS sincronizadas entre la base activa y `supabase/migrations`.
- Documentación de arquitectura y hardening actualizada.

## Advertencias no bloqueantes o que requieren validación externa

- Supabase mantiene 19 avisos del linter sobre funciones `SECURITY DEFINER` ejecutables por `authenticated`. Estas funciones contienen controles de autorización específicos y no se revoca `EXECUTE` indiscriminadamente porque varias forman parte del contrato RPC del producto.
- Supabase mantiene avisos INFO de índices no utilizados. No se eliminan automáticamente porque el proyecto aún no tiene suficiente carga histórica para distinguir índices realmente innecesarios de índices preventivos.
- La protección de contraseñas comprometidas de Supabase Auth requiere configuración administrativa de Auth que no está expuesta por esta conexión.

## Validaciones administrativas externas

Estas comprobaciones no se pueden certificar desde el conector actual y no se deben presentar como terminadas:

- branch protection y required checks administrativos de GitHub;
- protección/approvals definitivos de Production y Preview en Vercel;
- restore real de backup y certificación RPO/RTO;
- transacción real de prueba en cuentas productivas de Stripe/Coinbase.

## Criterio de cierre

No se considera producción certificada hasta que el último commit del branch de hardening obtenga un build Vercel satisfactorio, el pipeline requerido quede verde y se hayan resuelto las validaciones administrativas externas anteriores.
