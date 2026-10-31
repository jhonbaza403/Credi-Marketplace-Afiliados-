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
| Atención | `support_summary` | Consulta | Estado de casos propios |
| Atención | `create_support_case` | Aprobación | Crea caso y registra evento inicial cuando el historial lo permite |

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

Código guardado en la rama `feat/credi-ai-operations-console`. El Preview de Vercel y las pruebas automatizadas deben pasar sobre el último commit antes de abrir revisión. No se ha fusionado la rama ni desplegado en producción.
