# Credi — Registro de brechas y plan de incorporación

> Este registro separa código existente, código incorporado en la rama, validación pendiente y capacidades no construidas. Una página, una API o un build exitoso no significan que un servicio esté terminado.

## Evidencia revisada

- Rama: `feat/credi-ai-operations-console`.
- Snapshot de la entrega original del inventario: 104 archivos de página, 88 handlers API y 214 migraciones. La rama ha incorporado desde entonces empleo, seguridad de grupos Chat y preferencias explícitas del Muro; los conteos acumulados se registran al final de esta fase.
- Esta entrega añade 2 páginas, 4 handlers API, 1 migración y 2 archivos de pruebas.
- Inventario de rutas: [ROUTE_REGISTRY.md](ROUTE_REGISTRY.md). Visión canónica: [CREDI_PRODUCT_VISION.md](CREDI_PRODUCT_VISION.md).

## Brechas confirmadas

| Prioridad | Servicio | Evidencia / brecha | Trabajo requerido | Estado |
|---|---|---|---|---|
| P0 | Seguridad Chat | La política original de inserción directa permitía auto-unión. La migración nueva elimina esa política, crea el grupo con solo su creador y registra invitaciones pendientes; solo el destinatario puede aceptar y convertirse en miembro. | Validar migración, RPC y RLS en staging; ejecutar prueba SQL y E2E con dos cuentas/PINs dedicados. Canales y llamadas multiparte no implementados; IA no gestiona grupos. | Código en rama; validación de staging pendiente |
| P0 | LIVE | Existen sala, Stream, webhook, productos y chat LIVE. No hay evidencia E2E real completa. | Codificador real, Cloudflare Stream, dos espectadores, caída/reconexión, cierre y replay reproducible. | Código parcial; E2E real pendiente |
| P0 | Chat multimedia/llamadas | Existe UI, almacenamiento privado y gestores de llamadas. El test requiere dos cuentas y conversación configuradas. | Ejecutar texto, imagen, vídeo, archivo, voz, llamada bidireccional y recuperación con dos cuentas reales. | Parcial; E2E pendiente |
| P0 | Supabase/migraciones | Historial local/remoto sensible; no se ha autorizado aplicar nuevas migraciones a producción. | Reconciliar drift, probar la migración en entorno seguro y preparar despliegue reversible. | No aplicar automáticamente |
| P1 | Empleo/red profesional | `/jobs` redirigía a servicios; el formulario insertaba directamente en `jobs`; faltaban APIs de consulta/postulación y migración dedicada en el árbol revisado. | Vacantes, búsqueda, detalle, postulación única, perfil profesional con visibilidad y RLS. | Código incorporado en esta rama; migración/E2E pendientes |
| P1 | Personalización | Esta rama incorpora tabla privada de preferencias, API autenticada y ranking determinístico del Muro basado solo en temas elegidos explícitamente. | Falta integrar señales de seguimiento de cuentas y comunidades cuando existan, evaluar diversidad/frescura, feedback opcional y métricas con consentimiento. | Primera versión explícita en rama; migración/E2E de staging pendientes |
| P1 | Grupos/comunidades/eventos | Credi Chat incorpora grupos privados con invitaciones pendientes y aceptación expresa. No equivale aún a una red de comunidades. | Gestión posterior de miembros, transferencia de propiedad, canales, descubrimiento de comunidades, eventos, RSVP, moderación y notificaciones. | Chat groups en rama; comunidades/eventos/canales pendientes |
| P1 | Creadores/contenido | Existen muro, historias, reels, anuncios e interacciones. | Composer avanzado, edición, subtítulos, borradores, colaboraciones y analítica fiable de alcance/retención. | Parcial |
| P1 | Marketplace B2C | Existen catálogo, productos, carrito, checkout, pedidos y eventos. | E2E producto→carrito→pago→webhook→pedido→inventario→notificación; devoluciones y disputas. | Parcial; E2E de producción pendiente |
| P1 | B2B | Existen catálogo, RFQ, cotizaciones, selección/award y órdenes/pagos B2B. | Comparación de proveedores, negociación, términos, entrega, recepción, discrepancias y reputación. | Parcial |
| P1 | Afiliados | Existen enlaces, tracking y atribución. El ledger de liquidaciones no está expuesto a usuarios por RLS. | Vista/RPC de saldo segura, pagos, comprobantes, disputas y reversos auditables. | Parcial; liquidaciones visibles pendientes |
| P1 | Wallet/pagos | Existen wallet, intents, Stripe/webhooks, escrow y rails. | Pruebas integradas de autorización, webhook, ledger, reembolso, conciliación, idempotencia y notificación. | Parcial; ciclo completo por validar |
| P1 | Credi Intelligence | Hay 20 acciones discretas con permisos y aprobación HMAC; no hay orquestador durable multi-paso. | Interpretar intención, plan DAG, consultas RLS, aprobaciones por paso, ejecución durable, verificación y recuperación. | Acciones discretas implementadas; orquestador pendiente |
| P1 | Portales premium | Hay páginas y navegación común, con profundidad desigual. | Paneles propios, colas, indicadores reales, configuración, actividad, ayuda y accesibilidad por servicio. | Navegación integrada; profundidad pendiente |
| P2 | Accesibilidad/performance | No existe evidencia de auditoría transversal terminada por servicio/dispositivo. | WCAG, teclado/lector, subtítulos, contraste, mobile, Core Web Vitals y redes lentas. | Pendiente |
| P2 | Confianza/soporte | Hay moderación, cumplimiento, notificaciones y soporte. | Ciclo denuncia→revisión→decisión→apelación→notificación y métricas SLA. | Parcial |

## Incorporación realizada ahora: seguridad de Chat

- `20261101090000_credi_secure_chat_groups.sql` elimina la política RLS de INSERT directo sobre `conversation_members` y crea una tabla de invitaciones privada.
- La creación añade solo al creador como administrador; los otros contactos quedan en estado `pending` durante siete días.
- El destinatario es el único que puede aceptar/rechazar; al aceptar se crea su membresía en la misma transacción.
- Las RPC de invitación validan identidad y rol, y limitan cada grupo a 24 invitaciones activas.
- El directorio Credi permite seleccionar contactos por PIN, crear el grupo y procesar invitaciones recibidas.
- Se añade una prueba SQL de seguridad y un E2E opcional con creador e invitado.

**Activación pendiente:** ejecutar la migración y `supabase/tests/006_credichat_membership_security.sql` en staging, después E2E con dos cuentas dedicadas. No se ha aplicado a producción.

## Incorporación realizada ahora: red profesional

- `/jobs` deja de redirigir a `/services` y muestra un portal de vacantes.
- Se añade `GET/POST /api/jobs`; el empleador se obtiene de la sesión, no del cuerpo del cliente.
- Se añade detalle de vacante activa y postulación autenticada.
- El backend impide la auto-postulación y la base de datos evita duplicados por candidato/vacante.
- Se añade perfil profesional privado por defecto, con opción expresa de visibilidad pública.
- Se añade migración RLS para empleos, postulaciones y perfiles.
- Se añaden pruebas unitarias de validación y E2E de disponibilidad pública.

**Condición de activación:** la migración solo está en la rama. No se aplicó a Supabase de producción. El módulo no se declara operativo hasta probar la migración, los permisos y el recorrido con cuentas de empleador y candidato.

## Conteo acumulado de artefactos de esta rama

- Páginas Next.js: 106.
- Handlers API: 93.
- Migraciones Supabase locales: 217.
- Los archivos de pruebas unitarias, E2E y SQL se verifican contra el árbol del commit; no equivalen a pruebas ejecutadas en entornos reales.

## Orden recomendado

1. Reconciliar y probar migraciones sin tocar producción; habilitar el módulo profesional en un entorno de prueba.
2. Cerrar el bloqueo de membresía Chat y ejecutar pruebas con dos cuentas.
3. Validar LIVE real, recuperación y replay.
4. Completar feed personalizado, grupos y eventos.
5. Completar recorridos B2C, B2B, afiliados, wallet y pagos con pruebas integradas.
6. Construir el planificador durable de Credi Intelligence.
7. Profundizar portales, accesibilidad, analítica y soporte.

## Definición de terminado

Un servicio pasa a `Validado` solo si su flujo principal funciona con datos reales; RLS aísla usuarios; backend verifica estado persistido; reintentos no duplican operaciones; carga/vacío/error/éxito están resueltos; y las pruebas requeridas se ejecutan. Una prueba omitida se marca como omitida, nunca como aprobada.

## Restricciones de esta fase

- Mantener Vercel + Supabase + Cloudflare Stream.
- No mover el runtime de la aplicación a Cloudflare Workers.
- No crear ramas persistentes Supabase de pago.
- No aplicar migraciones a producción como parte de este cambio.
- Mantener el trabajo en PR #99; no abrir otra PR ni fusionar sin las pruebas requeridas.