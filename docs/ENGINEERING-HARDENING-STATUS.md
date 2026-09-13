# Credi Marketplace — Engineering Hardening Status

Fecha de referencia: 2026-09-13

Credi permanece como un modular monolith sobre Next.js/TypeScript/Vercel + Supabase/PostgreSQL, RLS/RPC y Zod. Prisma, Kubernetes y microservicios prematuros quedan fuera del baseline.

## Cerrado en código y base de datos

- `main` = production baseline; `develop` = integration baseline.
- Workflow `feature/* → develop → Preview/CI → main` documentado.
- Acceso privilegiado de Supabase centralizado en `admin.ts`; `service.ts` queda únicamente como shim temporal de compatibilidad.
- RLS comprobado en 125/125 tablas públicas actuales.
- Auditoría de FK sin índices: corregida; el asesor ya no reporta `unindexed_foreign_keys`.
- Índices duplicados detectados: eliminados.
- Políticas RLS permisivas redundantes detectadas: consolidadas y separadas por operación de escritura.
- `credichat_is_member` restringido para que un usuario autenticado no pueda consultar la membresía de otro usuario.
- Rate limiting distribuido mediante RPC atómico en PostgreSQL.
- OAuth token endpoint con Zod y PKCE S256 centralizado.
- Webhooks restringidos a HTTPS con validación DNS/IP anti-SSRF.
- Sanitización centralizada de filtros PostgREST.
- Tax & Fiscal Engine versionado con snapshots y settlement allocations.
- Stripe/Coinbase con estados financieros gobernados por webhook.
- Tests de regresión para PKCE, SSRF y filtros.
- Redirects de aliases legacy conocidos hacia rutas canónicas.
- Tipado de Stripe subscription interval corregido para usar `price.recurring.interval`.
- Mapeo explícito de filas Supabase a `ProductSummary` sin casts inseguros.
- Migraciones de hardening sincronizadas entre la base activa y `supabase/migrations`.
- Documentación de arquitectura y hardening actualizada.

## Pendientes que requieren una acción administrativa o una prueba real externa

- Activar y verificar branch protection y required checks de `main`/`develop` en GitHub; la conexión actual no dispone de permiso administrativo para modificar esa configuración.
- Configurar y verificar protecciones definitivas de Production/Preview en Vercel; la API conectada puede recibir el webhook de despliegue pero no expone la administración del proyecto actual.
- Ejecutar restore real de backup y certificar RPO/RTO en Supabase.
- Ejecutar transacciones de prueba con cuentas productivas de Stripe/Coinbase.
- Activar leaked-password protection de Supabase Auth desde la configuración administrativa de Auth.

## Advertencias informativas

- Supabase puede reportar funciones `SECURITY DEFINER` ejecutables por `authenticated`. No se revoca `EXECUTE` indiscriminadamente porque varias son RPC públicas previstas por el producto y contienen controles de autorización propios.
- Supabase reporta índices sin uso histórico. No se eliminan automáticamente mientras la plataforma no tenga suficiente carga real para distinguir índices preventivos de índices innecesarios.

## Criterio de cierre de producción

El código y la base de datos quedan en estado de hardening aplicado en el branch de auditoría. La certificación de producción exige además que el último build de Vercel termine correctamente y que las validaciones administrativas/operativas externas anteriores se ejecuten y queden registradas.
