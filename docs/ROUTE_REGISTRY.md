# Registro de rutas de Credi

## Alcance

Inventario de la rama `feat/credi-ai-operations-console`. El árbol inspeccionado contenía 104 archivos de página y 88 handlers API; esta rama incorpora dos páginas profesionales y cuatro handlers de empleo, para un total esperado de 106 páginas y 92 handlers. Estos conteos describen archivos, no la madurez de cada servicio.

Los grupos de rutas Next.js como `(public)` y `(auth)` no forman parte de la URL. La protección aquí indicada es una clasificación inicial: la autorización definitiva debe estar aplicada en el handler, RLS y pruebas. Ocultar enlaces en el frontend no sustituye autorización backend.

## Portales principales

| Ruta | Tipo | Protección / rol | Estado |
|---|---|---|---|
| `/` | Página | Pública | Portal de entrada; recorrido social-comercial por validar |
| `/social` | Página | Lectura pública; escritura autenticada | Parcial: feed y contenido; grupos/eventos/personalización pendientes |
| `/marketplace` | Página | Catálogo público; operaciones comerciales autenticadas | Parcial: recorrido integral de compra aún requiere E2E |
| `/chat` | Página | Usuario autenticado y miembro de conversación | Parcial: multimedia y llamadas requieren dos cuentas; grupos/canales bloqueados por seguridad |
| `/live` | Página | Anfitrión autenticado; audiencia según permisos de sala | Parcial: transporte y replay reales pendientes |
| `/b2b` | Página | Catálogo público; publicación y negociación autenticadas | Parcial: ciclo completo de abastecimiento/entrega por validar |
| `/affiliate` | Página | Programa público; panel afiliado autenticado | Parcial: liquidación de comisiones segura pendiente |
| `/wallet` | Página | Autenticación y propiedad de cuenta | Parcial: ciclo completo de pagos/liquidaciones por validar |
| `/intelligence` | Página | Autenticación | Parcial: dashboard existente; orquestador multi-paso pendiente |
| `/business-os` | Página | Autenticación y alcance de empresa propia | Parcial: consola de operaciones disponible |
| `/services` | Página | Pública | Portal índice de servicios |
| `/jobs` | Página | Lectura pública de vacantes activas | Implementado en esta rama; migración y E2E pendientes |
| `/jobs/create` | Página | Empleador autenticado | Implementado en esta rama; migración y E2E pendientes |
| `/jobs/[jobId]` | Página | Lectura pública de vacante activa | Implementado en esta rama; migración y E2E pendientes |
| `/jobs/profile` | Página | Propietario autenticado; visibilidad privada por defecto | Implementado en esta rama; migración y E2E pendientes |
| `/dashboard` y subrutas | Páginas | Autenticación; rol según dominio | Auditar guard y permisos de cada ruta |
| `/admin` y subrutas | Páginas | Rol administrativo / propietario de plataforma | Auditar guard y operaciones de cada ruta |

## APIs relevantes

| Ruta | Acceso esperado | Estado |
|---|---|---|
| `/api/jobs` | GET público de vacantes activas; POST autenticado | Implementado en rama; depende de migración |
| `/api/jobs/[jobId]` | GET público solo si la vacante está activa | Implementado en rama; depende de migración |
| `/api/jobs/[jobId]/applications` | POST autenticado; postulación única a vacante activa ajena | Implementado en rama; depende de migración |
| `/api/jobs/profile` | GET/PUT autenticado y limitado al perfil propio | Implementado en rama; depende de migración |
| `/api/ai/agent` | Autenticación, permisos por acción, aprobación y auditoría | 20 operaciones discretas; orquestador multi-paso pendiente |
| `/api/live`, `/api/live/stream`, `/api/live/cloudflare-webhook` | Sesión/host, verificación de webhook y autorización por sala | Requiere E2E real de extremo a extremo |
| `/api/chat/media` y `/api/chat/turn` | Autenticación y membresía de conversación | Requiere pruebas de dos cuentas y multimedia real |
| `/api/b2b/rfqs` y `/api/b2b/rfqs/[id]/quotes` | Usuario autenticado; comprador/proveedor autorizado | Parcial; ciclo comercial integral pendiente |
| `/api/wallet`, `/api/payments/*`, `/api/billing/*` | Propiedad, idempotencia, webhooks y permisos financieros | Parcial; conciliación y pruebas de producción pendientes |

## Reglas de mantenimiento

1. Registrar toda página/API nueva con tipo, protección, rol y estado.
2. Los handlers de escritura deben documentar sesión, propiedad del recurso, validación, rate limit, control de origen y auditoría aplicables.
3. Las rutas de rol empresarial o administrativo deben verificar el rol y el recurso en el servidor.
4. Los archivos privados solo se entregan tras comprobar la membresía/propiedad y emitir URL firmada de corta duración.
5. Una ruta solo pasa a `Validado` después de un E2E del recorrido real. Una prueba omitida se documenta como omitida, no aprobada.