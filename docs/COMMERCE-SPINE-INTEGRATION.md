# Credi — Integración comercial transversal

## Propósito

El recorrido comercial de Credi debe compartir identidad, catálogo, inventario y estado de operación:

`Usuario → Contenido → Producto → Inventario → Pedido → Pago → Entrega → Reputación`.

Los pilares Social, Mensajería, Comercio y Abastecimiento no deben crear copias independientes de estos objetos.

## Contrato canónico del circuito

| Etapa | Fuente / transición | Regla de integridad |
|---|---|---|
| Usuario | Supabase Auth + `profiles` | El usuario de la sesión se verifica en servidor; nunca se acepta un buyer_id arbitrario como autorización. |
| Contenido | `feed_posts`, `stories`, `reels`, contexto de operación | El contenido puede referenciar producto y origen, pero no constituye inventario ni un pedido. |
| Producto | `products`, `stores` | Precio, título, vendedor y estado se leen del servidor. |
| Inventario | `inventory`, `inventory_reservations`, `inventory_movements` | `create_pending_order_batch` reserva de forma atómica. `available_quantity` ya refleja unidades reservadas; no restar `reserved_quantity` por segunda vez. |
| Pedido | `orders`, `order_items`, `order_status_history` | El pedido se crea con RPC canónico; no insertar directamente desde la aplicación. |
| Pago | `payment_orchestrations`, `webhook_events` | La sesión de Stripe se crea por `POST /api/checkout`; solo un webhook verificado procesa el pago. |
| Entrega | Integración de transportista todavía no certificada | No marcar entregado con un dato del navegador ni afirmar tracking real sin evento autenticado del transportista. |
| Reputación | `get_transaction_rating_targets`, `submit_transaction_rating` | El RPC determina quién puede valorar después de una transacción; no admitir reseñas sin compra elegible. |

## Cambios de código en esta entrega

- Los servicios heredados de pedidos pasan a la función compartida `src/lib/orders/create-order.ts`.
- El adaptador transforma `productId` al formato JSON `product_id` que consume PostgreSQL, agrupa SKU repetidos, valida cantidades y admite múltiples líneas.
- La llamada al RPC se realiza con cliente de servicio solo después de comprobar que el usuario autenticado coincide con el comprador solicitado.
- El importe se resuelve desde los datos del catálogo dentro de PostgreSQL; el precio enviado por el navegador no decide el total.
- El servicio de checkout prepara el pedido y dirige la creación de la sesión a `POST /api/checkout`. No crea una segunda intención de pago.
- El servicio de inventario no reserva por segunda vez; verifica la reserva que ya produjo la creación atómica del pedido.
- Las mutaciones genéricas ya no permiten insertar pedidos, cambiar estados financieros ni sobrescribir inventario directamente.
- La lectura de pagos usa `payment_orchestrations`; se elimina el camino heredado de `payment_intents` / `payments` de este servicio.
- Se añade `cancel_pending_order`: el comprador solo puede cancelar su pedido pendiente y sin intento de pago activo. La transición libera la reserva original una sola vez.
- Los webhooks Twilio almacenan campos externos en `Map`, evitando asignar propiedades dinámicas de objetos a partir de claves no confiables.

## Abastecimiento sin duplicación de productos ni de inventario

El esquema ya ofrece relaciones `b2b_products.product_id` y `business_rfq_quotes.product_id` hacia el catálogo canónico. Una cotización debe vincularse con un producto del propio proveedor y la compra B2B debe reservar ese mismo producto e inventario.

No se debe copiar cada fila de `b2b_products` a una nueva fila minorista y mantener dos contadores de stock independientes. La integración externa requiere un adaptador de proveedor autorizado y un identificador de producto origen persistente. El registro `credi_supply_sources` ya separa fuentes y configuración no secreta; las credenciales permanecen en variables de entorno server-only.

La importación automática desde un proveedor externo y el dropshipping aún no se habilitan como capacidades terminadas: faltan adaptadores reales aprobados, reglas de vigencia de stock/precio, orden de compra al proveedor, confirmación de aceptación, cancelación, devoluciones y eventos de fulfillment. Hasta entonces una oferta B2B no debe presentarse como inventario minorista disponible por defecto.

## Capacidades restantes y estado honesto

| Capacidad | Estado |
|---|---|
| Feed, historias y publicaciones | Base existente; falta certificar publicación, privacidad, moderación y atribución de producto end-to-end. |
| Perfil personal y tienda | Parcial; identidad y tienda existen, falta cerrar experiencia híbrida y permisos. |
| Perfil de creador | Pendiente de perfil público/privado, suscripciones/seguimiento y herramientas de creador con permisos. |
| Chat, llamadas y multimedia | Base existente; faltan pruebas de carga, cuotas, entrega y permisos por tipo de conversación. |
| Canales de difusión | Pendiente de contrato de canales, suscriptores, roles, moderación y API de publicación. |
| Runtime de bots y Mini-Apps | Parcial; registros de apps/agents existen, falta sandbox real aislado, ejecución, scopes, límites, revocación y auditoría. |
| Marketplace, pedidos y pagos | Base existente; los servicios heredados ahora se alinean al ciclo canónico. Falta certificación integrada en Preview con proveedores reales. |
| Custodia efectiva de fondos | Pendiente. Un expediente de disputa no es custodia. Requiere proveedor de pagos/custodia habilitado por jurisdicción, cuentas conectadas, transferencias y pruebas de liquidación/devolución. |
| Seguimiento logístico | Pendiente de adaptadores y credenciales de transportistas, etiquetas, tracking firmado, eventos y pruebas de entrega. |
| RFQ y cotizaciones B2B | Base existente; falta certificar ciclo completo y endurecer permisos/concurrencia. |
| Importación mayorista de un clic | Parcial en modelo de datos por enlaces a producto canónico; falta flujo de importación, mapeo de SKU/variantes y adaptador aprobado. |
| Dropshipping automatizado | Pendiente hasta contar con inventario fuente fresco y API/proceso real de compra y fulfillment del proveedor. |

## Gates de certificación

1. Ejecutar todas las migraciones y pgTAP en la base local aislada.
2. Ejecutar ESLint, TypeScript, pruebas unitarias, E2E y build sobre el mismo commit.
3. Probar concurrencia, falta de stock, duplicados, expiración, pago tardío y reintentos de webhook.
4. Probar usuario comprador, vendedor, usuario ajeno y anónimo contra APIs y RLS.
5. Completar Preview con Stripe en test mode y callback verificado, sin enviar secretos al navegador.
6. Certificar transportistas, custodia y proveedores en sandbox antes de afirmar funcionamiento externo.

**Seguridad operativa:** ninguna migración de esta entrega debe aplicarse a proyectos Supabase alojados hasta comparar los historiales Production/Preview y aprobar explícitamente la reconciliación.