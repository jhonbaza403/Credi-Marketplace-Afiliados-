# Credi Marketplace — arquitectura funcional de los cuatro pilares

**Estado:** dirección de producto aprobada; implementación evaluada por capacidad.  
**Ámbito:** una sola plataforma, una sola identidad y cuatro pilares funcionales integrados.  
**Regla de veracidad:** la existencia de una ruta o componente no demuestra que toda la capacidad esté terminada, desplegada o certificada en producción.

## 1. Principio rector

Credi Marketplace se organiza como una red social de comercio con cuatro pilares que comparten identidad, perfiles, catálogo, inventario, operaciones, pagos, seguridad y datos:

1. Social, comunidad y video.
2. Mensajería y automatización.
3. Marketplace y social commerce.
4. Abastecimiento B2B y dropshipping.

Los pilares son dominios de producto y navegación; **no son cuatro aplicaciones separadas ni cuatro bases de datos**. Una publicación social puede referenciar un producto; un mensaje puede referenciar una negociación; una sesión LIVE puede mostrar productos; una orden puede consumir inventario; una compra B2B puede convertirse en una oferta minorista mediante un flujo de abastecimiento autorizado.

La navegación canónica se declara en `src/config/portal.ts`. La propiedad `pillar` clasifica destinos de experiencia, pero nunca concede permisos. Las páginas, Route Handlers y políticas RLS siguen siendo responsables de autenticar y autorizar.

## 2. Los cuatro pilares

### Pilar 1 — Social, comunidad y video

**Propósito:** que las personas descubran, publiquen, creen relaciones y conviertan contenido en actividad comercial.

| Capacidad | Alcance funcional | Evidencia localizada | Estado real |
|---|---|---|---|
| Identidad híbrida | Una sesión para perfil personal, creador y tienda/marca | Supabase Auth, `profiles`, `stores`, roles de usuario y paneles | **Parcial.** Existe identidad y tienda. Ya se añadieron perfiles de creador como entidad vinculada a `profiles`, sin añadir un rol global `creator`; el feed propio, monetización y verificación de creador aún requieren integración. |
| Feed social | Publicaciones, medios, historias, reels y anuncios | `/social`, `feed_posts`, `stories`, `reels`, `advertisements` | **Base implementada.** Moderación y comportamiento completo deben certificarse por rol y estado. |
| Video vertical | Descubrimiento y reproducción vertical de videos | `/videos` consulta reels publicados y usa reproducción en viewport | **Parcial.** La UI existe; la interacción de comentarios no está conectada en esa página y el estado de “me gusta” observado allí es local. No afirmar un algoritmo de recomendación avanzado. |
| Historias efímeras | Publicación y expiración | `/historias`, `PublishCenter`, lectura limitada por `expires_at` | **Base implementada.** Verificar creación, expiración y privacidad con sesiones reales. |
| Grupos y comunidades | Grupos públicos/privados, miembros, invitaciones, moderación y eventos | Hay contratos/RPC de grupos e invitaciones en las migraciones y el catálogo de Supabase | **Parcial.** La integración completa de UI, descubrimiento, eventos y pruebas de autorización sigue pendiente. |
| Credi LIVE | Emisión, espectadores, chat, producto vinculado y replay | `/live`, LiveKit Studio, `chat_live_rooms`, `chat_live_products`, webhooks LiveKit y Cloudflare Stream | **Base técnica presente; certificación de producción pendiente.** Solo marcar una sala como LIVE al verificar la fuente; no simular emisión ni replay. |

**Base añadida:** `creator_profiles` y `creator_follows` reutilizan `profiles` sin inventar un rol global `creator`. Las rutas `/creadores` y `/creadores/[handle]` permiten publicar un perfil, editarlo y seguir a otros creadores. Seguir, comentar, reaccionar, compartir y moderar todavía deben certificarse como flujos persistentes completos.

### Pilar 2 — Mensajería y automatización

**Propósito:** convertir conversaciones, comunidades y automatizaciones en una capa común de comunicación.

| Capacidad | Alcance funcional | Evidencia localizada | Estado real |
|---|---|---|---|
| Chat directo | Mensajes, contactos, conversaciones y sincronización en tiempo real | `/chat`, `CrediBusinessChat`, `CrediContactDirectory` y componentes de chat | **Base implementada;** pruebas de conversación real y permisos deben seguir siendo gates. |
| Voz, video y multimedia | Llamadas y envío de contenido | Componentes `CrediCallManager`, `CrediBusinessCall`, `CrediLiveChatPanel` y almacenamiento de medios | **Parcial.** Deben certificarse carga, límites por plan, tamaño, acceso y retención. |
| Grupos y supergrupos | Conversaciones grupales con roles, invitaciones y moderación | RPC y tablas de miembros/invitaciones identificadas en el catálogo | **Parcial.** No confundir los RPC existentes con canales masivos ya entregados al usuario. |
| Canales de difusión | Canales de solo lectura o publicación controlada, suscriptores y analítica | `broadcast_channels`, miembros, posts e invitaciones | **Parcial implementado.** Hay directorio, publicación de texto, Realtime, suscripción abierta/por aprobación, administración de solicitudes, moderación básica e invitaciones privadas de un solo uso. Falta multimedia, push y métricas. |
| Bots y Mini-Apps | Registro, permisos, comandos, eventos, webhooks, instalación y revocación | `/apps`, `/developer`, `/automation`, APIs de apps, claves y reglas de automatización | **Parcial.** El runner ahora registra una propuesta antes de actuar y solo `notify_owner` crea una notificación persistente y deduplicada. Acciones no soportadas se marcan fallidas. Sigue pendiente el runtime aislado de bots, el sandbox Mini-App, scopes de ejecución, cuotas y revocación. |
| Notificaciones | Alertas de mensajes y operaciones | Centro de notificaciones y servicios de notificación | **Base presente;** entrega push/multicanal y preferencias por dispositivo requieren pruebas y conexión completa. |

**Objetivo funcional:** un centro de mensajes con chats directos, grupos, canales, llamadas, archivos, notificaciones y bots autorizados. Las automatizaciones deben tener scopes mínimos, cuotas, registro de auditoría y confirmación humana para acciones sensibles.

### Pilar 3 — Marketplace y social commerce

**Propósito:** que el contenido, los productos, la compra, el pago, la entrega y la reputación pertenezcan al mismo flujo comercial.

| Capacidad | Alcance funcional | Evidencia localizada | Estado real |
|---|---|---|---|
| Catálogo | Productos, tiendas, variantes, disponibilidad y publicaciones | `/marketplace`, `/products`, `products`, `stores`, `inventory` | **Base implementada.** La consolidación de SKU, variantes y publicaciones multicanal debe completarse. |
| Reseñas verificadas | Valoraciones ligadas a compras reales y prevención de reseñas falsas | API `/api/ratings`, componentes de reputación y valoración transaccional | **Parcial.** Debe verificarse la prueba de compra y la autorización de cada reseña. |
| Preguntas y respuestas | Preguntas públicas por producto, respuestas de vendedores y moderación | No se certificó un módulo completo de Q&A en esta auditoría | **Pendiente de verificación/implementación.** |
| Social commerce | Enlaces de contenido a producto, conversación y checkout | `operation_context`, muro social y rutas de checkout | **Base implementada.** Deben comprobarse atribución, permisos y continuidad del contexto. |
| Live Shopping | Productos asociados a la sala LIVE y acciones de compra | `/api/live/products` y `chat_live_products` | **Base presente.** Prueba integral desde producto fijado hasta orden y pago pendiente. |
| Checkout y pagos | Orden transaccional, proveedor y confirmación por webhook | `/api/orders`, `/api/checkout`, Stripe y `payment_orchestrations` | **Base implementada.** Mantener confirmación de pago exclusivamente server-side y operaciones idempotentes. |
| Wallet | Ledger, saldos y operaciones internas | `/wallet`, `wallet_ledger` y RPC financieros | **Base presente.** No presentar la Wallet como cuenta bancaria o servicio regulado. |
| Escrow | Retención y liberación efectiva de fondos según hitos | `/escrow` y expedientes asociados a órdenes | **Parcial.** La pantalla actual administra expedientes; por sí sola no demuestra que fondos estén retenidos por un proveedor ni que la custodia esté operativa. |
| Logística | Tarifas, etiquetas, transportista, tracking y entrega | Hay páginas/APIs de Credi Flex | **Parcial/no certificada.** No afirmar cálculo universal de envíos ni rastreo real en tiempo real sin adaptadores de transportistas y eventos probados. |

**Objetivo funcional:** una orden canónica con comprador, vendedor, líneas, importes, moneda, inventario reservado, estado de pago, entrega, disputas y devolución. El navegador nunca puede declarar por sí mismo que un pago fue cobrado, un envío fue entregado o un escrow fue liberado.

### Pilar 4 — Abastecimiento B2B y dropshipping

**Propósito:** conectar compradores empresariales, mayoristas, proveedores y vendedores minoristas sobre el mismo catálogo e inventario gobernado.

| Capacidad | Alcance funcional | Evidencia localizada | Estado real |
|---|---|---|---|
| Directorio de proveedores | Descubrir proveedores y señales de verificación | `/proveedores-verificados`, perfiles empresariales y controles de cumplimiento | **Base presente.** El estado de verificación debe ser evidencia documental y de reglas, no una etiqueta visual. |
| Mayoristas | Catálogo y operaciones B2B | `/b2b`, `/compras-mayoristas`, productos y órdenes B2B | **Base presente.** Verificar precios por escalón, MOQ y reglas por proveedor. |
| RFQ y cotizaciones | Solicitud, respuestas, comparación y adjudicación | `/abastecimiento`, `/api/b2b/rfqs`, cotizaciones y selección | **Base implementada.** Debe certificarse el ciclo comprador-proveedor-adjudicación-orden. |
| Importación de catálogo | Mapear producto del proveedor a catálogo de Credi | Hay APIs de catálogo y datos B2B, pero no se confirmó una importación completa de un clic con mapeo y autorización | **Pendiente de cierre.** |
| Dropshipping | Publicar oferta minorista sin inventario físico inicial, sincronizar proveedor, disponibilidad y pedidos | No se verificó un ciclo completo de pedido al proveedor, fulfillment y seguimiento | **Pendiente.** No descontar ni prometer stock del proveedor sin sincronización contractual y evidencia actualizada. |
| Precios escalonados | MOQ, tramos de cantidad, divisas, vigencia y condiciones | Debe comprobarse de extremo a extremo en el esquema y UI B2B actuales | **Pendiente de certificación.** |

**Objetivo funcional:** importar un proveedor a una oferta de Credi mediante un adaptador con autorización, normalización, trazabilidad y políticas de margen. La oferta minorista debe conservar relación con el proveedor de origen y jamás inventar stock ni tiempos de despacho.

## 3. Arquitectura técnica de referencia

### Stack principal que se conserva

| Capa | Decisión para Credi | Regla |
|---|---|---|
| Web y panel | Next.js App Router, React, TypeScript y Tailwind | Una aplicación web, un portal y UI responsive. |
| Ejecución y despliegue | Vercel | Plataforma principal; GitHub es la fuente de código. |
| Backend y persistencia | Supabase Auth, PostgreSQL, RLS, Storage, Realtime y Edge Functions | Fuente canónica de identidad, datos, permisos y operaciones. |
| Pagos | Stripe y adaptadores de proveedores aprobados | Los webhooks verificados deciden el resultado del pago. |
| LIVE | LiveKit para interacción en tiempo real y Cloudflare Stream para transporte/distribución y replay compatibles | No duplicar motores de streaming ni dar por grabada una emisión sin evidencia. |
| Archivos | Supabase Storage para objetos de aplicación; Cloudflare Stream para medios de video compatibles | Elegir por caso de uso; no duplicar automáticamente en S3/R2. |
| Mensajería | Supabase Realtime y servicios de dominio existentes | Añadir infraestructura dedicada solo si métricas reales lo exigen. |
| Búsqueda | PostgreSQL y filtros existentes inicialmente | No introducir Elasticsearch/Meilisearch sin medir latencia, relevancia y volumen. |
| Eventos | `commerce_events`, `operation_id` y timeline operativo existentes | Mantener trazabilidad y usar outbox/colas cuando un requisito medido lo justifique. |

### Aplicación modular, no microservicios prematuros

La estructura de Credi debe mantener fronteras explícitas:

```text
src/
  app/              rutas, páginas y Route Handlers
  components/       UI compartida
  features/
    social/
    messaging/
    marketplace/
    supply/
    payments/
    identity/
  services/         casos de uso y contratos de dominio
  lib/              adaptadores e infraestructura
  schemas/          validación de entrada y salida
  types/            contratos TypeScript
supabase/
  migrations/
  functions/
  tests/
```

Un dominio puede evolucionar a un servicio independiente solo cuando tenga una razón verificable: carga distinta, ciclo de despliegue autónomo, límites de disponibilidad, equipo responsable o necesidad de aislamiento. Antes de eso, los módulos permanecen en la aplicación modular y comparten los contratos del núcleo.

### Cliente móvil

La primera etapa es web responsive y experiencia móvil comprobable. La app nativa iOS/Android puede abordarse después con React Native/Expo si el producto y las métricas lo justifican. Debe reutilizar los contratos y APIs de Credi; no crear otro backend, otra identidad ni otra fuente de datos. Flutter y React Native no deben coexistir como dos clientes nativos redundantes sin una decisión documentada.

### Datos y contratos compartidos

| Dominio | Fuente de verdad |
|---|---|
| Identidad | Supabase Auth + `profiles` |
| Tienda/marca | `stores` y sus propietarios autorizados |
| Catálogo | `products`, categorías, variantes y relaciones canónicas |
| Existencias | `inventory`, reservas y movimientos |
| Compra y pedido | `orders`, `order_items` y estados de pedido |
| Pago | `payment_orchestrations`, webhooks y registros financieros |
| Wallet | Ledger y RPC financieros |
| Social | Publicaciones, historias, reels y relaciones sociales |
| LIVE | `chat_live_rooms`, productos vinculados y eventos de transporte |
| B2B | Empresas, proveedores, RFQs, cotizaciones y adjudicaciones |
| Inteligencia | Eventos y decisiones versionados; no sustituye las reglas de dominio |

Un producto no puede tener un stock paralelo por módulo. Una orden no puede tener dos estados financieros autoritativos. Los adaptadores externos conservan IDs de proveedor y transforman sus datos al modelo de Credi, sin convertir al proveedor en la fuente de verdad de Credi.

## 4. Contratos transversales obligatorios

Toda operación entre pilares debe cumplir:

- **Identidad:** un usuario puede tener perfil personal y relaciones de creador/tienda; los permisos se calculan en servidor y RLS.
- **Autorización:** el rol enviado desde el navegador nunca concede acceso. Se valida propietario, organización, membresía y scope.
- **Idempotencia:** creación de órdenes, pagos, devoluciones, importaciones, webhooks y automatizaciones toleran reintentos.
- **Eventos:** operaciones relevantes llevan `request_id`, `operation_id`, actor, fuente, entidad, estado y fecha.
- **Consistencia de stock:** reserva, consumo y liberación son transacciones atómicas; no se descuenta inventario dos veces.
- **Pagos:** ningún cliente actualiza un pago a `paid`; la confirmación viene del servidor y del evento verificado del proveedor.
- **Contenido:** moderación, reporte, bloqueo y controles de privacidad antes de ampliar la distribución.
- **Medios:** límites de tamaño y cuota se aplican en servidor; URL firmadas y políticas de Storage no sustituyen los controles de negocio.
- **IA y bots:** recomendación separada de ejecución; scopes mínimos, presupuestos, auditoría y aprobación humana en operaciones sensibles.

## 5. Hoja de ruta de MVP a Super-App

La hoja de ruta distingue capacidades que ya tienen código de capacidades que todavía deben certificarse. No se reescribe lo que funciona; se conectan y cierran los contratos.

### Fase 1 — Núcleo social + chat

1. Completar perfiles híbridos: personal, creador, tienda/marca, roles y privacidad.
2. Consolidar feed, historias, reels/video, seguimiento, comentarios y reacciones persistentes.
3. Certificar grupos, invitaciones, membresía, moderación y privacidad.
4. Completar chat directo/grupal, llamadas, multimedia y notificaciones.
5. Los canales de difusión tienen una primera versión con RLS, miembros, posts e invitaciones de un solo uso; completar aprobaciones, moderación, analítica y notificaciones.
6. Ampliar el runtime de bots solo después de aprobar un sandbox aislado, scopes mínimos, cuotas, revocación y auditoría.
7. Completar Mini-Apps como extensiones aisladas; el directorio de apps actual no se considerará suficiente por sí solo.

**Salida de fase:** un usuario mantiene una identidad y puede pasar de contenido a conversación sin perder contexto ni abrir otra cuenta.

### Fase 2 — Marketplace minorista + Wallet

1. Consolidar SKU, variantes, catálogo, inventario y publicaciones.
2. Unificar carrito, creación de orden, reserva de stock y checkout.
3. Cerrar Stripe, Wallet, conciliación, devoluciones y disputas con evidencia de webhooks.
4. Diseñar custodia de fondos con un proveedor y un marco jurídico compatible; no llamar escrow a un expediente que no retiene dinero.
5. Conectar producto a publicaciones y LIVE Shopping.
6. Integrar tarifas, etiquetas y tracking con transportistas autorizados.

**Salida de fase:** una publicación puede generar una orden pagada, inventario liquidado, entrega rastreable, reputación verificable y resolución de disputa.

### Fase 3 — Abastecimiento B2B + Bots

1. Consolidar directorio de proveedores, verificación y perfiles empresariales.
2. Completar RFQ, cotizaciones, negociación, MOQ y precios escalonados.
3. Construir adaptadores de proveedores y normalización de catálogo.
4. Implementar importación autorizada de ofertas con mapeo SKU/variantes y margen.
5. Sincronizar disponibilidad y precio del proveedor con reglas de frescura.
6. Orquestar dropshipping y fulfillment con estados, devoluciones y atribución.
7. Publicar API y runtime gobernado para bots/automatizaciones con scopes, cuotas y auditoría.

**Salida de fase:** una oferta B2B puede convertirse en publicación minorista sin inventar disponibilidad, duplicar catálogos ni perder el vínculo de origen.

## 6. UX: cuatro pilares, navegación sencilla

La navegación de escritorio y el menú de soluciones se organizan por los cuatro pilares. En móvil debe priorizarse una navegación breve de cinco destinos:

1. Inicio / Video.
2. Explorar / Tienda.
3. Crear / Vender.
4. Mensajes / Canales.
5. Perfil / Wallet.

La barra móvil definitiva requiere validación de rutas protegidas, espacio inferior, accesibilidad, safe areas y pruebas en pantallas pequeñas. No debe implementarse una barra que tape contenido o duplique el header actual.

Reglas de UX:
- Una sola cuenta y un solo estado de sesión.
- Acciones persistentes para crear/publicar y abrir mensajes.
- El usuario entiende si está publicando contenido, vendiendo un producto o creando una oferta mayorista.
- Una misma oferta no se vuelve a capturar para cada canal.
- Los estados de error, carga, permisos y verificación son visibles y recuperables.
- Ningún acceso visible conduce a una página vacía o a una capacidad simulada.

## 7. Confianza, cumplimiento y costos

- KYC/KYB por tipo de vendedor/proveedor y jurisdicción.
- Moderación con estados y revisión apelable.
- Disputas, devoluciones y reclamaciones con evidencia.
- Protección de cuentas, MFA/passkeys, antifraude y límites de operación.
- Protección de datos, privacidad por defecto y minimización de información.
- Almacenamiento, transcodificación, CDN y retención de video medidos por uso real.
- Límites server-side para multimedia, llamadas, mensajes, bots y APIs.
- Panel de observabilidad con tasas de éxito, errores, latencia y costo unitario por capacidad.

No se añaden Redis, Kafka, RabbitMQ, Elasticsearch, microservicios, Kubernetes, otro proveedor de streaming o una segunda app móvil solo por semejanza con plataformas de referencia. Cada nueva pieza exige un caso de uso, costo, responsable, contrato y criterio de salida medible.

## 8. Criterios de certificación

Un pilar solo se declara terminado cuando:
1. Todas las rutas enlazadas responden y sus flujos de autenticación funcionan.
2. Los contratos API y TypeScript coinciden con las migraciones y los RPC reales.
3. RLS y permisos han sido probados con usuario propietario, usuario ajeno y usuario anónimo.
4. Los casos felices, fallos, duplicados, reintentos y concurrencia tienen pruebas.
5. El recorrido E2E cubre el flujo entre pilares y no solo una pantalla.
6. Los webhooks externos validan firma, deduplican eventos y registran trazabilidad.
7. Build, lint, typecheck, pruebas unitarias, pgTAP, E2E y checks de despliegue pasan sobre el mismo commit.
8. La experiencia de Preview y Producción se verifica sin afirmar que una prueba local certifica servicios remotos.

**Regla final:** Credi no será una colección de copias de Facebook, Telegram, Amazon y Alibaba. Será un ecosistema propio donde comunidad, conversación, comercio y abastecimiento comparten identidad, catálogo, operaciones, seguridad y confianza.
