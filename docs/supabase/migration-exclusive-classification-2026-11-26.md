# Reconciliación de historial de migraciones — Credi Marketplace

Fecha de evidencia: 2026-11-26  
PR: #103  
Proyectos: Producción `fusnmvmveqdzmzohhlzm`, Preview `yjxybhpubxhblfyfzlmk`

## Estado remoto observado

| Medida | Producción | Preview |
|---|---:|---:|
| Migraciones registradas | 226 | 244 |
| Versiones compartidas | `219` | `219` |
| Exclusivas de Producción | 7 | — |
| Exclusivas de Preview | — | 25 |

La diferencia histórica original sigue siendo 6 versiones exclusivas de Producción y 23 de Preview. Se agregaron tres registros nuevos mediante la API de migraciones: dos versiones de la corrección de privilegios (una en cada proyecto) y una versión de provisión de buckets en Preview. Los esquemas/privilegios resultantes se verificaron, pero los registros generados por la API no tienen el mismo timestamp. Se añadieron sus archivos con los timestamps exactos para que el CLI oficial pueda comparar y completar la reconciliación sin volver a ejecutar efectos destructivos.

**No editar directamente** `supabase_migrations.schema_migrations`. La reparación debe ejecutarse con el CLI oficial después de verificar cada efecto, usando `supabase migration repair` únicamente para versiones cuyo efecto ya exista.

## Clasificación de las 6 versiones registradas solo en Producción

| Versión | Nombre | Efecto observado | Decisión |
|---|---|---|---|
| `20261106123959` | professional network + feed preferences | Jobs, applications, professional profiles y preferencias de feed; esas tablas existen también en Preview. | Comparar constraints, RLS, grants y triggers; no reejecutar en bloque. |
| `20261106130450` | secure chat groups reconciliation | Reconciliación de invitaciones/RPC de grupos. El contenido es idéntico al archivo Preview `20261101090000` (mismo blob SHA). | Marcar el equivalente como reconciliado solo tras comparar ACL/RLS y RPC en ambos proyectos. |
| `20261106130552` | FK index reconciliation | Índices de FK; el contenido es idéntico al archivo Preview `20261106130555`. | Comparar índices por definición y confirmar ausencia antes de reparar. |
| `20261106130607` | private operational tables | Políticas restrictivas para tablas operativas; contenido idéntico a Preview `20261106130610`. | Verificar políticas existentes y marcar equivalente; no duplicar políticas. |
| `20261106131032` | order status trigger correction | Corrige el trigger a UPDATE-only y registra únicamente cambios de estado. | **Efecto confirmado en ambos proyectos**: misma función, trigger AFTER UPDATE OF status. No volver a ejecutar la versión histórica anterior. |
| `20261106131148` | LIVE room description NOT NULL | Columna `description` con DEFAULT '' y NOT NULL. | **Efecto confirmado en ambos proyectos**: NOT NULL, default vacío y cero NULL. |

## Clasificación de las 23 versiones registradas solo en Preview

| Versión | Nombre | Efecto | Evidencia / condición |
|---|---|---|---|
| `20260924134300` | wallet journals/refund schema | Esquema de journals, FK e helper privado de validación. | Tablas presentes en ambos; el cuerpo de los validadores difiere. No reparar hasta unificar y probar invariantes contables. |
| `20260924134854` | settlement account bindings | Tabla privada de destinos de liquidación. | Tabla presente en ambos; revisar constraints, índices y ACL. |
| `20260924134855` | settlement audit base | Tablas de auditoría de aprobación/pago. | Ambas tablas presentes; comparar constraints, índices y grants. |
| `20261002010000` | marketing ads/audiences | Tablas base de audiencias/campañas. | Tablas presentes; validar constraints y tipos antes de marcar. |
| `20261002020000` | profile verification photos | Tabla de fotos privadas, trigger y bucket `identity-profile-private`; incluye `ON CONFLICT DO UPDATE` del bucket. | Tabla y bucket presentes en ambos. No replay: el upsert podría cambiar configuración existente. |
| `20261002030000` | marketing metrics/social integrations | Métricas, eventos y conexiones sociales. | Tablas presentes; ocho columnas numéricas tienen tipos distintos. Preflight actual: cero valores incompatibles, sin filas no nulas en las columnas examinadas. |
| `20261002040000` | financial trigger functions | Funciones financieras y sobrecargas de checkout. | La función de checkout de 5 argumentos coincide; la de 4 argumentos difiere en cuerpo/configuración/ACL. No replay hasta pruebas de inventario, idempotencia y rollback. |
| `20261003020000` | AI sessions | Tabla de sesiones de IA con RLS por usuario. | Tabla presente en ambos; comparar políticas y grants. |
| `20261012080000` | moderation fields guard | Archivo histórico intencionalmente inerte; efecto sustituido por versión canónica posterior. | No ejecutar. Revisar y reparar como histórico solo tras confirmar el guard canónico en ambos. |
| `20261012150000` | LIVE realtime publication | Archivo histórico intencionalmente inerte; efecto sustituido por versión canónica posterior. | No ejecutar. Verificar publicación actual y reparar como histórico. |
| `20261031183000` | jobs/professional profiles | Jobs, applications y perfiles profesionales. | Tablas presentes en ambos; comparar constraints/RLS/grants con la migración combinada de Producción. |
| `20261101090000` | secure chat groups | Invitaciones y RPC de grupos. | Contenido idéntico a `20261106130450` en Producción; revisar ACL y políticas efectivas. |
| `20261102100000` | social feed preferences | Preferencias de feed explícitas del usuario. | Tabla presente en ambos; verificar grants/RLS exactos. |
| `20261104040000` | commerce RLS/ACL parity | Habilita RLS y reemplaza grants de tablas comerciales. | Requiere comparación política por política; no ejecutar sobre Producción sin confirmar equivalencia. |
| `20261104040100` | trigger search paths | Ajusta search_path de cuatro funciones trigger. | Comparar `proconfig` y hashes en ambos; no reemplazar funciones a ciegas. |
| `20261104040200` | Credi LIVE commerce schema | Columnas LIVE y tabla de productos fijados en sala. | Tablas principales presentes; comparar columnas, constraints, políticas y grants. |
| `20261104040300` | platform owner profile guard | Instala trigger de protección de `platform_owner`. | Verificar trigger y función exactos en ambos antes de reparar. |
| `20261104040400` | Credi PIN generation | Sustituye generador de PIN con `extensions.gen_random_bytes` y search_path vacío. | Comparar cuerpo, propietario y ACL; no sustituir hasta probar altas de usuario. |
| `20261104040500` | private helpers | Restaura numerosas funciones privadas. | Comparar cada firma, cuerpo, search_path y ACL. No copiar en bloque. |
| `20261104040600` | private identity profile photos | Repite tabla/foto privada, políticas y upsert de bucket. | Efectos estructurales presentes; contiene upsert de bucket. No replay. |
| `20261106130555` | FK index reconciliation | Índices de FK. | Mismo contenido que Producción `20261106130552`; confirmar índices existentes. |
| `20261106130610` | private operational tables | Políticas restrictivas de tablas operativas. | Mismo contenido que Producción `20261106130607`; confirmar políticas actuales. |
| `20261106130629` | anon operation timeline restriction | Pinea search_path y revoca ejecución anónima del timeline. | Confirmar ACL y search_path de la función en Producción y Preview. |

## Efectos ya verificados fuera del ledger

- Los 11 grupos de tablas clave (jobs, applications, perfiles, feed preferences, invitations, settlement, profile photos, AI sessions y LIVE products) existen en ambos proyectos.
- El trigger `record_order_status_change()` es idéntico en ambos: solo AFTER UPDATE OF status.
- `chat_live_rooms.description` es NOT NULL DEFAULT '' en ambos y no hay valores NULL.
- Los permisos directos de cliente en tablas sociales/financieras se alinearon en ambos entornos.
- Los tres buckets `marketplace-media`, `kyc-documents`, `kyb-documents` ya existen en Preview con la misma configuración que Producción.
- Los nuevos registros de privilegios y Storage tienen timestamps remotos exactos en los archivos locales:
  - `20261126224643_align_client_table_privileges.sql`
  - `20261126224654_align_client_table_privileges.sql`
  - `20261126224746_provision_compliance_and_marketplace_storage_buckets.sql`

## Plan CLI requerido para cerrar el ledger

1. Ejecutar `supabase migration list` en cada proyecto enlazado y exportar el resultado.
2. Comparar cada efecto de la matriz con `pg_catalog`, RLS, ACL, índices, Storage y funciones desplegadas.
3. Para equivalencias confirmadas, registrar el timestamp con `supabase migration repair --status applied <timestamp>`; esta orden solo cambia el historial, no ejecuta SQL.
4. No marcar como aplicadas las versiones financieras/privadas cuya equivalencia aún no esté demostrada.
5. Ejecutar `supabase db push --dry-run` primero y revisar toda la lista de pendientes. Solo después de la aprobación explícita, aplicar en Preview y repetir la validación.
6. Repetir en Producción con respaldo restaurable y ventana de cambio. Nunca usar `db push` para saltar la revisión histórica.

## Estado

La matriz de clasificación está completa a nivel de fuente y evidencia observada. La reconciliación del ledger remoto **no está completada**: falta ejecutar el CLI oficial con acceso de enlace a ambos proyectos y finalizar la comparación de los RPC/funciones financieros y privados. No se modificó directamente la tabla de historial.
