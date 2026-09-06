# Supabase migrations — auditoría de consolidación

## Alcance

Revisión estática de las migraciones versionadas en `supabase/migrations/` del repositorio Credi Marketplace.

## Resultado

Las migraciones revisadas cubren extensiones, esquema núcleo, órdenes, items, inventario, idempotencia, afiliados, pagos, webhooks, máquina de estados, funciones, checkout, crecimiento del marketplace, RLS, índices, publicaciones/ofertas/social, triggers, auditoría, seguridad, carrito, B2B, tracking de afiliados, notificaciones, jobs, servicios y órdenes B2B.

### Riesgos detectados

1. Existen dos archivos con prefijo `013` y dos con prefijo `014`. Esto hace que el orden lógico quede ambiguo para una instalación nueva y debe resolverse antes de considerar la historia de migraciones totalmente consolidada.
2. La migración `003_orders.sql` definía `public.order_status` sin `expired`, mientras `010_order_state_machine.sql` utiliza ese estado. `003_orders.sql` fue corregida para incluir `expired` desde la definición canónica. El bloque defensivo de `010` se conserva para instalaciones ya existentes.
3. Renombrar migraciones históricas ya desplegadas sin consultar el historial remoto puede romper la correspondencia con la tabla de migraciones de Supabase. Por seguridad, los prefijos duplicados no se renombrarán automáticamente desde Git sin confirmar primero el estado remoto.

## Regla de operación

Antes de renombrar, reordenar o eliminar migraciones históricas:

```bash
supabase migration list
```

El resultado remoto debe compararse con `supabase/migrations/` y cualquier migración ya aplicada en producción debe conservar su identidad histórica.

## Estado

- Esquema canónico de `order_status`: corregido para instalaciones nuevas.
- Duplicados de prefijos 013/014: identificados; requiere reconciliación con historial remoto antes de renombrar.
- RLS/RPC/triggers/constraints: deben seguir validándose mediante `supabase db reset` en un entorno local y contra el historial remoto autorizado.
- No se introduce `instruments` del quickstart como tabla productiva.

Esta auditoría es deliberadamente conservadora: no destruye historial de migraciones que podría estar aplicado en Supabase.
