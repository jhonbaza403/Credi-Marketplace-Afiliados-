# Credi — Reconciliación de migraciones y recuperación Supabase

**Estado de la revisión:** solo lectura. No se ejecutó `migration repair`, `db push`, ni se aplicó DDL en Producción o Preview.

## 1. Estado remoto y catálogo local

Lectura directa de los dos proyectos Supabase activos:

| Fuente | Migraciones registradas / archivos |
|---|---:|
| Producción `fusnmvmveqdzmzohhlzm` | 225 |
| Preview `yjxybhpubxhblfyfzlmk` | 242 |
| Catálogo local de esta rama | 259 |
| Versiones duplicadas en el catálogo local | 0 |
| Versiones remotas sin archivo local | 0 |
| Archivos locales sin registrar en ninguno de los dos entornos | 11 |

La diferencia neta de cantidades es 17, pero la diferencia entre conjuntos es 29 versiones: 6 registradas solo en Producción y 23 solo en Preview. No son 17 migraciones que falten en una sola dirección.

### Solo en Producción (6)

| Versión | Nombre |
|---|---|
| `20261106123959` | `production_professional_network_and_feed_preferences` |
| `20261106130450` | `credi_secure_chat_groups_reconciliation` |
| `20261106130552` | `index_uncovered_foreign_keys_reconciliation` |
| `20261106130607` | `restrict_private_operational_tables` |
| `20261106131032` | `fix_order_status_history_trigger_schema` |
| `20261106131148` | `align_live_room_description_not_null` |

### Solo en Preview (23)

| Versión | Nombre |
|---|---|
| `20260924134300` | `wallet_journals_and_refund_schema` |
| `20260924134854` | `settlement_account_bindings_base` |
| `20260924134855` | `settlement_audit_base` |
| `20261002010000` | `marketing_ads_and_audiences_core` |
| `20261002020000` | `profile_verification_photos` |
| `20261002030000` | `marketing_metrics_and_social_integrations` |
| `20261002040000` | `restore_financial_trigger_functions` |
| `20261003020000` | `ai_sessions_core` |
| `20261012080000` | `guard_social_moderation_fields` |
| `20261012150000` | `enable_live_realtime_publication` |
| `20261031183000` | `credi_professional_jobs_and_profiles` |
| `20261101090000` | `credi_secure_chat_groups` |
| `20261102100000` | `social_feed_preferences` |
| `20261104040000` | `restore_preview_commerce_rls_acl_parity` |
| `20261104040100` | `harden_trigger_function_search_paths` |
| `20261104040200` | `restore_credi_live_commerce_schema` |
| `20261104040300` | `platform_owner_profile_guard` |
| `20261104040400` | `fix_credi_pin_generation` |
| `20261104040500` | `restore_missing_preview_private_helpers` |
| `20261104040600` | `restore_private_identity_profile_photos` |
| `20261106130555` | `index_uncovered_foreign_keys_reconciliation` |
| `20261106130610` | `restrict_private_operational_tables` |
| `20261106130629` | `restrict_anon_operation_timeline` |

### Locales aún no registradas en ninguno de los proyectos (11)

`20261105210000`, `20261105230000`, `20261107021305`, `20261107024000`, `20261125010000`, `20261125020000`, `20261125030000`, `20261126010000`, `20261126020000`, `20261126190000`, `20261126194500`.

Estos archivos no se pueden marcar como ejecutados hasta probar sus efectos en cada entorno.

## 2. Diferencias observadas de esquema

Una comparación de catálogos SQL encontró:

| Objeto | Producción | Preview | Diferencias detectadas |
|---|---:|---:|---:|
| Tablas públicas | 165 | 165 | 0 |
| Columnas | 1.917 | 1.917 | 13 definiciones distintas |
| Vistas | 5 | 5 | 0 por huella |
| Funciones públicas | 100 | 98 | 2 ausentes en Preview y 46 definiciones con distinta huella |
| Políticas RLS | 317 | 323 | 1 solo en Producción, 7 solo en Preview, 30 definiciones distintas |
| Índices | 638 | 634 | 12 solo en Producción, 8 solo en Preview, 2 definiciones distintas |
| Restricciones | 936 | 932 | 15 solo en Producción, 11 solo en Preview, 15 definiciones distintas |
| Triggers | 112 | 112 | 0 por huella |
| Tablas públicas sin RLS | 0 | 0 | 0 |

La huella de esquema es más importante que igualar contadores. Por ejemplo, 13 columnas numéricas tienen precisión/escala distinta entre entornos. La migración local `20261125010000_align_marketing_numeric_precision` podría corregir parte de ese estado, pero no se debe aplicar antes de medir los datos existentes y definir cómo tratar valores que no entren en la precisión de destino.

También hay 2 funciones de liquidación presentes en Producción que no aparecen en Preview: `pay_settlement_allocation` y `reverse_settlement_allocation`. No eliminar ni reemplazar estas funciones con una reparación de historial.

## 3. Respaldo lógico: requisito previo

La organización está en el plan Free. La documentación de Supabase indica que las copias automáticas diarias corresponden a Pro/Team/Enterprise; para Free recomienda generar backups lógicos con CLI y conservarlos fuera del proyecto.

El script `scripts/backup-supabase-environments.sh` genera para ambos entornos:
- `roles.sql` (`--role-only`)
- `schema.sql`
- `data.sql` (`--use-copy --data-only`)
- `SHA256SUMS` por proyecto y un manifiesto general

Crea el directorio local con permisos restrictivos y no escribe secretos ni URLs de conexión en los archivos del respaldo. La salida está en `backups/`, que Git ignora. No se deben adjuntar backups a un PR, commitearlos ni subirlos al repositorio.

### Cómo ejecutarlo localmente

En un terminal seguro de tu equipo, define las dos URLs de conexión como variables de entorno. Usa el *Session Pooler* del panel **Connect** salvo que tu red soporte una conexión directa. No compartas las URLs por chat, no las guardes en `.env.example` y no las pegues en comandos que queden en el historial.

En PowerShell, puedes introducirlas sin mostrarlas en pantalla y ejecutar el script desde Git Bash/WSL:

```powershell
$secure = Read-Host "Connection string de Producción" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $env:PRODUCTION_DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }

$secure = Read-Host "Connection string de Preview" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $env:PREVIEW_DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }

bash scripts/backup-supabase-environments.sh

Remove-Item Env:PRODUCTION_DATABASE_URL
Remove-Item Env:PREVIEW_DATABASE_URL
```

Si usas Bash, exporta ambas variables en la sesión actual y ejecuta el mismo script. Verifica que existan los tres archivos SQL, los hashes y los dos directorios antes de autorizar cualquier cambio remoto.

**Alcance:** este respaldo lógico de base de datos no incluye los bytes de los objetos de Supabase Storage, ni sustituye una exportación independiente de esos archivos. Tampoco debe considerarse una prueba de restauración hasta restaurarlo en un proyecto aislado y comprobarlo.

## 4. Política de reparación

No usar `migration repair` como herramienta para hacer coincidir números. Esa operación cambia solo el registro de historial; no ejecuta SQL ni confirma que el esquema contiene los efectos de la migración.

No ejecutar `db push` hasta:
1. Obtener y verificar respaldos de Producción y Preview.
2. Comparar el SQL de cada una de las 29 versiones exclusivas y las 11 pendientes locales.
3. Identificar migraciones equivalentes con distinto número/versión y decidir una única versión canónica, sin duplicar DDL.
4. Probar cada migración candidata contra una base aislada del snapshot de ese entorno.
5. Comprobar RLS, SECURITY DEFINER, grants, triggers, índices, restricciones, buckets y funciones financieras.
6. Obtener un `db push --dry-run` sin acciones destructivas ni operaciones ya realizadas.
7. Confirmar explícitamente el plan de cambios para cada proyecto por separado.

El objetivo final será tener una única lista canónica de versiones y el mismo esquema funcional en ambos entornos. No se declara sincronizado hasta volver a consultar los historiales remotos y comparar nuevamente las huellas de esquema.

## 5. Estado de ejecución de esta revisión

- Lectura de proyectos e historiales remotos: realizada.
- Comparación del catálogo local: realizada.
- Comparación de objetos y permisos: realizada en modo lectura.
- Script de respaldo lógico: añadido al repositorio; aún no ejecutado, porque no tengo los connection strings.
- Respaldo descargado y restaurado de prueba: pendiente.
- `migration repair`: no ejecutado.
- `db push`: no ejecutado.
- DDL remoto: no ejecutado.
