# Remediación de seguridad de perfiles — 2026-11-02

## Alcance

Se ejecutó una inspección de solo lectura de la base Supabase de producción `fusnmvmveqdzmzohhlzm`, seguida de dos migraciones correctivas aplicadas mediante el flujo de migraciones de Supabase. No se modificaron datos de perfiles ni se crearon ramas de base de datos.

## Hallazgo crítico

La tabla `public.profiles` tenía permisos de tabla `UPDATE` para el rol `authenticated`, una política de actualización de la fila propia y un trigger que protegía únicamente `platform_owner`. El permiso de tabla permitía actualizar `role` e `is_active`; el trigger anterior no protegía esos campos. Eso abría una ruta de escalada de privilegios y de reactivación de cuentas suspendidas.

Además, la función `public.sync_credi_profile_from_auth()` asignaba `is_active = true` en cada sincronización de Auth de una fila existente, lo que podía reactivar una cuenta suspendida al actualizar metadatos o correo.

## Correcciones aplicadas en producción

### Migración `20261102120853_harden_profile_privilege_columns`

- Revocó todos los privilegios de tabla de `authenticated` sobre `public.profiles`.
- Restauró únicamente `SELECT`.
- Concedió `UPDATE` solo sobre `full_name`, `avatar_url`, `phone` y `phone_e164`.
- Reforzó el trigger para bloquear cambios directos autenticados a `id`, `role`, `platform_owner` e `is_active`.

### Migración `20261102121039_preserve_profile_suspension_on_auth_sync`

- Ajustó la protección para permitir el cambio controlado de rol customer/vendor dentro del trigger anidado de sincronización de Auth; el cliente no puede llamar directamente a la función de sincronización.
- Eliminó la reasignación de `is_active = true` en actualizaciones de perfiles existentes.
- Conservó la activación inicial de una fila nueva.
- Mantuvo el acceso de ejecución de la función de sincronización reservado a `postgres`.

## Verificación posterior

La consulta de verificación posterior confirmó:

- `authenticated` conserva `SELECT` en `profiles`.
- `authenticated` puede actualizar `full_name`, `avatar_url`, `phone` y `phone_e164`.
- `authenticated` no tiene permiso de actualización sobre `role`, `platform_owner` ni `is_active`.
- La función de sincronización ya no reactiva perfiles existentes.
- Los dos registros de perfil conservaron sus roles, estado activo y bandera de propietario; no se cambiaron datos de usuario.
- El historial remoto registra 219 migraciones, sin versiones duplicadas.

Se ejecutó una prueba transaccional simulando el rol `authenticated`, con actualización inocua y tentativas de cambio de rol, estado activo y propietario; la transacción terminó con `ROLLBACK`. La verificación de privilegios confirma que los tres campos privilegiados no son actualizables por ese rol.

## Otros hallazgos de Supabase

- 160 tablas públicas inspeccionadas; RLS está habilitado en las 160.
- 303 políticas RLS registradas en el esquema público.
- `public.credi_supply_sources` no tiene política RLS, pero tampoco concede privilegios de tabla a `anon` o `authenticated`; el acceso se limita a `service_role` y `postgres`.
- Las cinco vistas públicas inspeccionadas usan `security_invoker=true`.
- Security Advisor: la protección contra contraseñas filtradas está deshabilitada (aviso WARN). Debe habilitarse si el plan y la configuración del proyecto lo permiten; no se cambió la facturación ni el plan.
- Performance Advisor informó índices sin uso observado. No se eliminaron: la falta de uso en la ventana observada no demuestra que sean innecesarios y su eliminación requiere análisis de consultas y carga.

## Estado de integración con GitHub

Los dos archivos de migración se añadieron a la rama `fix/credi-health-accuracy-2026-11-02` para revisión y trazabilidad:

- `supabase/migrations/20261102120853_harden_profile_privilege_columns.sql`
- `supabase/migrations/20261102121039_preserve_profile_suspension_on_auth_sync.sql`

Las migraciones ya están aplicadas en producción; por tanto, la PR contiene su representación de código y documentación, no una instrucción para volver a aplicarlas. El historial remoto debe seguir siendo la fuente de verdad al sincronizar el repositorio.

## Límites

Esta remediación cierra la vía directa de modificación de campos privilegiados desde el rol `authenticated` y evita la reactivación automática durante sincronización de Auth. No certifica por sí sola todos los permisos administrativos, las políticas de las 160 tablas, los webhooks, pagos, LIVE, almacenamiento, ni los flujos comerciales de extremo a extremo. La PR #101 permanece sin fusionar hasta que CI valide el nuevo SHA.
