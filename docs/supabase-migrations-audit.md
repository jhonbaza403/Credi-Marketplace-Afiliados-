# Supabase migrations — reconciliación y pruebas locales

**Última inspección de solo lectura:** 2026-11-03  
**Estado:** archivos remotos recuperados para revisión; certificación local pendiente. Este documento no autoriza cambios en producción.

## Historial y archivos

El proyecto Supabase conectado (fusnmvmveqdzmzohhlzm) registró 219 versiones aplicadas en la inspección. La rama del PR #97 contenía originalmente 215 archivos de migración. Se recuperaron desde la rama de revisión del PR #101 los siete archivos exactos que faltaban, sin reconstruir SQL por nombre ni volver a aplicar migraciones en producción.

| Fuente | Archivos/versiones |
|---|---:|
| Rama main (inventario anterior) | 214 |
| PR #97 antes de la recuperación | 215 |
| Historial remoto registrado | 219 |
| PR #97 después de añadir las siete migraciones | 222 |

Las siete migraciones recuperadas son:

- 20261027165845_credi_supply_sources_registry.sql
- 20261027165904_support_fk_indexes.sql
- 20261031002051_guard_social_moderation_fields.sql
- 20261031002056_enable_live_realtime_publication.sql
- 20261031183932_platform_owner_access_provisioning.sql
- 20261102120853_harden_profile_privilege_columns.sql
- 20261102121039_preserve_profile_suspension_on_auth_sync.sql

Estas siete versiones ya constaban en el historial remoto. Añadir sus archivos al repositorio permite que una base local limpia reproduzca el historial; **no se deben ejecutar otra vez en producción**.

## Tres archivos locales sin versión remota coincidente

Se conservan, sin renombrar ni borrar:

- 20261012080000_guard_social_moderation_fields.sql
- 20261012150000_enable_live_realtime_publication.sql
- 20261031191500_credichat_groups_channels.sql (migración nueva del PR #97; no aparece en el historial remoto observado).

Las dos primeras son versiones históricas locales anteriores a las migraciones remotas de moderación y LIVE. No se declara equivalencia byte a byte. La migración de grupos/canales es una incorporación pendiente del PR #97 y no debe aplicarse a producción hasta completar revisión, CI y autorización de despliegue.

## Pruebas SQL y ejecución reproducible

Se corrigieron las referencias obsoletas de columnas/tablas en los tests raíz y los RAISE NOTICE colocados fuera de bloques PL/pgSQL. Los tests raíz supabase/tests/001 a 012 se ejecutarán como scripts SQL normales mediante psql con ON_ERROR_STOP; no se presentarán como tests pgTAP.

Se añadió scripts/run-supabase-sql-tests.sh y un job separado de GitHub Actions que:

1. Instala Supabase CLI 2.107.0 (anclado a la configuración local actual con [inbucket]; CLI 2.108.0+ y CLI v3 requieren [local_smtp]).
2. Ejecuta supabase db reset --local --no-seed para recrear una base vacía y reproducir todas las migraciones de esta rama.
3. Obtiene el DB_URL local desde supabase status --env --output-format text.
4. Ejecuta todos los archivos SQL de primer nivel en supabase/tests/, ordenados por nombre, con ON_ERROR_STOP.
5. Detiene el stack local incluso si una prueba falla.

Este job no enlaza el proyecto remoto ni recibe secretos de Supabase. La reconstrucción local no se ha ejecutado desde este entorno porque aquí no están disponibles Docker, Supabase CLI ni PostgreSQL; la certificación dependerá del resultado real de ese job en el SHA actualizado del PR.

### Límites de la carpeta de integración

supabase/tests/integration/ no se incluye todavía en el runner automático. La inspección encontró un archivo llamado ' 001_checkout_atomicity.sql' cuyo contenido es Python para generar artefactos, varios archivos SQL envueltos en fences Markdown y un escenario de concurrencia que necesita dos sesiones coordinadas. Ejecutarlos como si fueran SQL convencional sería incorrecto. Se mantienen intactos y fuera de la puerta de CI hasta normalizar su formato y preparar un runner de integración real.

## Verificación de RLS

009_rls.sql deja de comprobar únicamente que RLS esté activado. Crea fixtures sintéticos dentro de una transacción y evalúa lecturas y escrituras como anon, dos identidades authenticated distintas y service_role. Comprueba aislamiento por propietario, acceso de catálogo público, edición permitida del perfil, denegación de campos privilegiados (role, platform_owner, is_active), denegación de escrituras entre usuarios y bypass esperado de service_role. Finaliza con ROLLBACK.

La prueba de perfiles se basa también en la inspección de solo lectura del proyecto remoto: authenticated conserva UPDATE de full_name, avatar_url, phone y phone_e164, pero no de role, platform_owner ni is_active. La prueba automatizada aún debe pasar en la base local recreada.

## Motor fiscal

012_tax_engine.sql ya no compara count(*) con cero negativo. Inserta tres registros inválidos, uno por cada importe, y exige que las restricciones CHECK rechacen gross_amount < 0, taxable_amount < 0 y tax_amount < 0. También verifica el conjunto de tablas fiscales, RLS y permisos de las RPC relacionadas.

Se eliminó una comprobación global que exigía search_path="" a todas las funciones SECURITY DEFINER del esquema público: mezclaba funciones de otros dominios y producía falsos positivos fuera del alcance del motor fiscal.

## Hallazgos pendientes de configuración

- public.credi_supply_sources tiene RLS habilitado y no concede acceso de tabla a anon ni authenticated; queda reservada a servicios. No se debe agregar una política pública para silenciar una alerta.
- La protección de contraseñas filtradas de Supabase Auth figuró deshabilitada en el asesor de seguridad; su habilitación depende de las opciones disponibles en el proyecto/plan.
- Los asesores mostraron índices sin uso observado; no se eliminan sin análisis de carga y consultas.

## Seguridad de producción

Todas las inspecciones de Supabase realizadas para esta reconciliación fueron de solo lectura. No se ejecutó db reset remoto, no se aplicó ninguna migración en producción y no se modificaron registros de usuarios. La única reconstrucción permitida para este proceso es la base local aislada del job de CI.