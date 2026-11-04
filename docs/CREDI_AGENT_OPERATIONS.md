# Credi AI — Operaciones gobernadas

## Propósito

Credi AI debe convertir solicitudes del usuario en operaciones dentro de Credi, no limitarse a describir pasos. Esta fase conecta la consola de Business OS con servicios de datos y operaciones existentes. No cambia producción ni evita las reglas de autorización de Supabase.

## Contrato de autorización

- Las consultas usan la sesión del usuario y quedan acotadas por RLS.
- Las acciones de escritura requieren una propuesta y una aprobación temporal de un solo uso (10 minutos).
- La firma de aprobación vincula usuario, acción, recurso y hash canónico de los datos revisados. Alterar destinatario, recurso, importe, texto o cualquier valor invalida el permiso.
- Cada solicitud tiene identificador de correlación y se registra en `agent_action_audit`.
- Una acción sin manejador explícito devuelve error; no se presenta como completada.
- Los pagos creados por el agente son intents; no significan que el cargo, la liquidación o el reembolso se hayan completado.

## Operaciones con manejador real

| Módulo | Operación | Nivel | Resultado / límite |
|---|---|---|---|
| Marketplace / Inventario | `commerce_summary`, `inventory_summary` | Consulta | Productos, activos, unidades y stock bajo de la tienda propia |
| Muro / Reels | `social_summary` | Consulta | Conteos de contenido propio |
| Muro | `create_social_post` | Aprobación | Crea publicación; respeta estado de moderación y no se autoaprueba |
| Chat | `chat_summary` | Consulta | Conversaciones y volumen reciente bajo membresía existente |
| Chat | `send_commercial_message` | Aprobación | Envía solo en conversación donde el usuario ya es miembro |
| LIVE | `live_summary` | Consulta | Estado de salas del anfitrión y repeticiones registradas; no verifica transporte extremo a extremo |
| Afiliados | `affiliate_summary` | Consulta | Enlaces, clics y conversiones accesibles por RLS; no expone el libro de liquidaciones |
| B2B | `b2b_pipeline` | Consulta | RFQ propios y reglas de automatización habilitadas |
| B2B | `create_b2b_rfq` | Aprobación | Crea solicitud de cotización propia |
| B2B | `prepare_rfq_followup` | Aprobación | Prepara el texto de seguimiento de RFQ propio; no lo envía automáticamente |
| Marketplace | `publish_offer` | Aprobación | Crea oferta vinculada a un anuncio propio |
| Pagos | `create_payment` | Aprobación | Crea intent para pedido propio, con importe derivado del servidor y límites; el proveedor aún debe completar el flujo |
| Billetera | `pay_order_from_wallet` | Aprobación | Ejecuta el RPC transaccional existente; verifica dueño, pedido pendiente, fondos, idempotencia y asiento contable antes de confirmar el pago |
| Atención | `support_summary` | Consulta | Estado de casos propios |
| Atención | `create_support_case` | Aprobación | Crea caso y registra evento inicial cuando el historial lo permite |
| Marketplace | `orders_summary` | Consulta | Resume pedidos propios y totales pendientes por moneda |
| Billetera | `wallet_summary` | Consulta | Lee cuentas propias y separa saldos por moneda |
| Marketing | `marketing_summary` | Consulta | Campañas propias, estados y presupuestos configurados |
| Marketing | `create_marketing_campaign` | Aprobación | Crea únicamente un borrador; no activa anuncios ni consume presupuesto |

## Bloqueos deliberados

1. Los canales y grupos de Credi Chat no se activan desde el agente mientras la política de inserción de membresías permita auto-unión arbitraria. La creación y adhesión deben resolverse mediante RPC transaccional con invitaciones/roles.
2. Credi AI no cambia `moderation_status` de publicaciones. Un contenido pendiente no se describe como públicamente visible.
3. El agente no consulta directamente `affiliate_commission_ledger`; la tabla tiene una política que deniega acceso a usuarios autenticados. Los saldos deben salir de una vista/RPC de liquidación diseñada y auditada.
4. Un resumen de salas LIVE no demuestra emisión real. El criterio de producción sigue siendo encoder → Cloudflare Stream → espectadores → desconexión/recuperación → replay.
5. La preparación de un seguimiento B2B no envía un mensaje sin permiso separado y sin comprobar destinatarios.

## Pruebas requeridas antes de producción

- Unitarias: matriz de permisos, rechazo de acciones desconocidas y propiedades heredadas.
- Seguridad: usuario A no puede leer/escribir recursos de B; tokens de aprobación de un solo uso, expiración y vinculación exacta al payload.
- Integración Supabase: políticas RLS reales para todas las operaciones de consulta/escritura.
- E2E: login, propuesta, confirmación, ejecución, comprobación del estado real y rastro de auditoría.
- LIVE: transmisión física real y recuperación; un build verde no sustituye esta prueba.

## Estado de esta fase

20 operaciones con manejadores explícitos guardadas en la rama `feat/credi-ai-operations-console`. El Preview de Vercel y las pruebas automatizadas deben pasar sobre el último commit antes de abrir revisión. No se ha fusionado la rama ni desplegado en producción.

## Capa de portales premium

La navegación transversal compartida está implementada como `CrediServicePortalNav` y se integra en la plantilla `ModuleShell` y en los portales principales de servicios. Cada área conserva su ruta, componentes, datos y controles; la navegación común no sustituye los permisos ni crea datos ficticios.

Portales contemplados: Comunidad/Muro, Marketplace, Credi Chat, Credi LIVE, Afiliados, B2B, Wallet, Credi Intelligence y Business OS. La siguiente iteración visual debe profundizar en el espacio de trabajo específico de cada área (indicadores, cola de trabajo, actividad, acciones disponibles y estados reales), no duplicar pantallas con botones decorativos.

## Siguiente fase: orquestador de lenguaje natural

Esta fase es una especificación de construcción, no una capacidad que se declare terminada todavía.

1. **Interpretación segura:** convertir la petición en una intención tipada y limitada al catálogo de capacidades registradas. Rechazar lo ambiguo cuando pueda cambiar destinatarios, importes, publicaciones, permisos o datos irreversibles.
2. **Planificación sin efectos:** construir un plan explícito con pasos, dependencias, datos requeridos, propietario, recursos y resultado esperado. Las consultas previas usan la sesión del usuario y RLS; planificar nunca ejecuta escrituras.
3. **Autorización por paso:** presentar cada escritura sensible con recurso, destinatario, contenido e importe exactos. Emitir la aprobación HMAC existente por operación; no permitir que una aprobación genérica autorice todo un flujo financiero o externo.
4. **Ejecución coordinada:** ejecutar el grafo de pasos de manera secuencial o por dependencias, con idempotencia y registro persistente de cada transición. Los reintentos automáticos se limitan a operaciones seguras; pagos, mensajes ya enviados y acciones no reversibles pasan a revisión manual cuando el resultado sea incierto.
5. **Verificación independiente:** volver a consultar el estado persistido desde el backend, contrastar el resultado esperado y cerrar como exitoso solo cuando exista evidencia. Ante fallo parcial, conservar los pasos completados, señalar el bloqueo y ejecutar una compensación únicamente cuando esté definida y sea segura.

### Contrato mínimo del plan

Cada plan debe conservar `plan_id`, `request_id`, usuario propietario, intención, versión del plan, pasos ordenados, dependencias, entradas canónicas, nivel de riesgo, aprobaciones por paso, claves de idempotencia, estado, evidencia de verificación y vínculo a `agent_action_audit`. Nunca confiar en datos del modelo para identidad, precios, saldos, permisos, propiedad de recursos ni confirmación de operaciones.

### Criterios de aceptación de la orquestación

- Una petición en lenguaje natural produce un plan comprensible y sin efectos secundarios.
- El plan resuelve los recursos con datos de la sesión actual y no puede acceder a los recursos de otra cuenta.
- Cada paso de escritura se autoriza individualmente y el payload ejecutado coincide exactamente con el aprobado.
- Un fallo a mitad de flujo deja un estado parcial explícito y permite reanudar de forma idempotente sin duplicar pagos o mensajes.
- La verificación consulta el objeto real y su auditoría; una respuesta del modelo o un HTTP 200 sin persistencia no bastan.

## Seguridad de grupos en Credi Chat

En esta rama se añade una base de grupos privados con consentimiento:
- La política de INSERT directo en `conversation_members` se elimina.
- Crear un grupo agrega al creador como administrador y registra hasta 24 invitaciones pendientes; los invitados no se hacen miembros automáticamente.
- Solo el destinatario autenticado puede aceptar o rechazar. La aceptación añade su membresía en la misma transacción.
- Las invitaciones expiran a los siete días y la tabla solo es legible por quien invita y quien recibe.
- El cambio requiere migración y prueba SQL en staging y E2E con dos cuentas/PINs de prueba. No se ha aplicado a producción.
- Canales, gestión avanzada de roles y llamadas multiparte siguen pendientes. Credi AI no gestiona grupos.

## Validación real aún pendiente

- **LIVE:** codificador real → Cloudflare Stream → al menos dos espectadores autenticados → desconexión y reconexión → finalización → replay reproducible. Deben revisarse webhooks, sincronización de estados y recuperación.
- **Credi Chat y llamadas:** dos cuentas de prueba distintas, conversación existente con membresía correcta, envío y recepción de texto/imagen/vídeo/archivo, permisos de cámara y micrófono, llamada bidireccional, desconexión y recuperación.
- Los tests E2E que dependen de `E2E_USER_EMAIL`, `E2E_PEER_EMAIL`, `E2E_CONVERSATION_ID`, `PLAYWRIGHT_BASE_URL`, `E2E_STORAGE_STATE_PATH`, `E2E_OPERATION_ID` y `E2E_LIVE_ROOM_ID` deben constar como omitidos cuando falta su configuración. Un workflow verde con esos tests omitidos no valida LIVE ni llamadas reales.

## Estado actualizado

- Navegación común de portales: implementada en esta rama.
- Plantilla premium compartida para módulos avanzados: implementada en esta rama.
- Áreas de negocio con sus propios flujos y pantallas: existentes, con madurez desigual; requieren auditoría funcional individual.
- Orquestador de lenguaje natural con grafo de operaciones, ejecución durable y recuperación: pendiente de implementación y pruebas.
- LIVE real y llamadas multimedia con cuentas de prueba: pendientes de evidencia E2E.
- La rama sigue sin fusionarse y no se ha desplegado a producción.

## Red profesional y empleo

La primera entrega de empleo se ha incorporado en la misma rama:
- `/jobs` muestra vacantes activas y permite buscar por cargo, empresa y ubicación.
- `POST /api/jobs` publica una vacante asociada a la sesión autenticada.
- `GET /api/jobs/[jobId]` devuelve solo vacantes activas sin exponer el identificador interno del empleador.
- `POST /api/jobs/[jobId]/applications` registra una postulación única por candidato/vacante; impide la auto-postulación.
- `/jobs/profile` permite mantener un perfil profesional privado por defecto y hacerlo visible a usuarios autenticados cuando el titular lo decide.
- La migración `20261031183000_credi_professional_jobs_and_profiles.sql` añade las tablas y políticas RLS. Está en la rama y no se aplicó a producción.

La red profesional todavía no incluye revisión/gestión completa de candidaturas, currículum privado adjunto, entrevistas ni herramientas avanzadas de reclutamiento. Credi Intelligence aún no tiene operaciones específicas para vacantes y postulaciones; no debe afirmar que gestiona estos procesos hasta que existan y se prueben los handlers correspondientes.
