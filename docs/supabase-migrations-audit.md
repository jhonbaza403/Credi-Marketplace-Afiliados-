# Supabase migrations — auditoría de reconciliación

**Fecha de observación:** 2026-11-03  
**Estado:** BLOQUEA LA CERTIFICACIÓN DE REPRODUCIBILIDAD; no autoriza cambios en producción.

## Alcance y evidencia

Se comparó el inventario de archivos SQL del repositorio con el historial de migraciones aplicado que devuelve el proyecto Supabase conectado. La inspección fue de solo lectura.

| Fuente | Migraciones |
|---|---:|
| Rama `main` | 214 |
| Rama del PR #97 (`feat/credi-dynamic-social-commerce-shell`) | 215 |
| Historial registrado en Supabase | 219 |

El PR #97 añade `20261031191500_credichat_groups_channels.sql`; esa migración aparece en la rama del PR y no en el historial remoto consultado. No debe aplicarse a producción hasta superar CI, revisión y autorización de despliegue.

## Versiones remotas sin archivo con el mismo identificador en la rama del PR

- `20261027165845_credi_supply_sources_registry`
- `20261027165904_support_fk_indexes`
- `20261031002051_guard_social_moderation_fields`
- `20261031002056_enable_live_realtime_publication`
- `20261031183932_platform_owner_access_provisioning`
- `20261102120853_harden_profile_privilege_columns`
- `20261102121039_preserve_profile_suspension_on_auth_sync`

## Archivos locales sin versión coincidente en el historial remoto consultado

- `20261012080000_guard_social_moderation_fields.sql`
- `20261012150000_enable_live_realtime_publication.sql`
- `20261031191500_credichat_groups_channels.sql` (solo rama del PR #97)

Los dos archivos locales de moderación y publicación LIVE tienen nombres funcionalmente parecidos a dos versiones remotas posteriores. **No se asume que sean equivalentes byte a byte ni que se puedan renombrar sin consecuencias.**

## Procedimiento obligatorio de reconciliación

1. Recuperar las cinco migraciones remotas que no tienen un archivo local equivalente identificado, desde el historial Git confiable, artefactos de despliegue o una copia segura. No reconstruirlas por inferencia a partir del nombre.
2. Comparar el contenido de las migraciones locales antiguas con las versiones remotas posteriores y establecer su correspondencia mediante revisión SQL y hashes.
3. Conservar los identificadores que ya están registrados en Supabase. No renombrar ni borrar migraciones históricas aplicadas.
4. Reconciliar el historial con `supabase migration list` desde un entorno autenticado y revisar cualquier diferencia antes de generar nuevas migraciones.
5. En una base local vacía y aislada, ejecutar `supabase db reset` y las pruebas SQL de esquema, RLS, pagos, idempotencia, webhooks y concurrencia.
6. Comparar el esquema local resultante con el remoto mediante introspección y asesores. No usar `db reset` sobre el proyecto remoto.

## Pruebas SQL

La suite contiene pruebas SQL de esquema, órdenes, inventario, idempotencia, afiliados, pagos, webhooks, máquina de estados, RLS y seguridad, además de escenarios de integración. El archivo `001_schema.sql` tenía envoltura Markdown que impedía ejecutarlo directamente como SQL; se ha limpiado esa envoltura. La suite completa todavía debe ejecutarse desde una base local recién creada y quedar incorporada a CI antes de certificar las migraciones.

## Asesores Supabase observados

- `public.credi_supply_sources`: RLS está habilitado y no tiene políticas. Esto es un comportamiento fail-closed; no se añadirá una política pública para silenciar el aviso. Debe confirmarse si el acceso exclusivo de servidor es el diseño previsto.
- Leaked Password Protection está deshabilitado en Auth. Es una configuración pendiente del proyecto, no una corrección que deba simularse con código.
- Los asesores de rendimiento muestran índices no utilizados; no se eliminarán sin análisis de consultas, cardinalidad y carga real.

## Decisión de seguridad

No se han aplicado migraciones ni modificaciones SQL al proyecto Supabase conectado. La divergencia descrita permanece como bloqueo de certificación hasta recuperar y verificar los archivos exactos y superar la prueba de instalación limpia.
