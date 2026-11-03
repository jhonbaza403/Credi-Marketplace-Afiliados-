# Credi Marketplace — Ecosistema integrado y arquitectura objetivo

Fecha: 2026-11-02
Estado: arquitectura objetivo; no representa por sí misma funcionalidades certificadas.

## Principio rector

Credi es una red social de comercio y negocios. La identidad social, la identidad comercial, el catálogo, el contenido, la conversación, la compra, la afiliación y la inteligencia operan sobre entidades y eventos compartidos. Cada módulo debe consumir capacidades comunes y no crear una segunda versión de usuarios, tiendas, pedidos, pagos, mensajes o permisos.

## Arquitectura canónica

- Aplicación y despliegue: Next.js App Router sobre Vercel.
- Datos y backend: Supabase/PostgreSQL, Auth, RLS, Storage y Realtime.
- Pagos: Stripe como integración actual, detrás de adaptadores de proveedor y estados financieros gobernados por webhooks.
- Mensajería externa: Twilio detrás de adaptadores; Credi Chat sigue siendo el producto y la fuente de verdad de conversaciones.
- Vídeo: Cloudflare Stream como proveedor multimedia opcional para Credi LIVE, no como runtime ni plataforma de despliegue de la aplicación.
- Inteligencia: CREDI INTELLIGENCE como capa de orquestación y gobierno; modelos externos son proveedores sustituibles, no identidad del producto.
- Procesamiento asíncrono: adoptar patrón Outbox y workers/colas compatibles con la arquitectura Vercel + Supabase; no introducir Cloudflare Workers como plataforma de despliegue.

## Dominios y responsabilidades

| Dominio | Responsabilidad | Entidades canónicas | No debe duplicar |
| --- | --- | --- | --- |
| Identity & Access | Sesiones, perfil, roles, MFA, membresía y permisos | auth user, profile, membership, role grant | Usuarios o roles paralelos |
| Social Graph | Seguir, bloquear, silenciar, relaciones y comunidades | follow, block, mute, community membership | Contactos de Chat |
| Content | Publicaciones, historias, reels, comentarios, reacciones y reportes | post, story, media asset, comment, reaction, report | Catálogos ni órdenes |
| Discovery | Feed, ranking, búsqueda, recomendaciones y tendencias | feed cursor, search document, ranking signals | Copias editables de publicaciones |
| Messaging | Conversaciones, mensajes, adjuntos, presencia y llamadas | conversation, participant, message, attachment | Identidad ni almacenamiento de medios |
| Commerce | Catálogo, SKU, variantes, precio, inventario y promociones | store, product, variant, inventory, price | Productos sociales independientes |
| Checkout & Orders | Carrito, checkout, orden, entrega, cancelación y devolución | cart, order, order item, fulfillment | Estados financieros |
| Payments & Ledger | Intentos, transacciones, reembolsos, conciliación y libro | payment intent, transaction, ledger entry, refund | Saldo editable desde cliente |
| Affiliate | Referencias, atribución, comisiones, reversos y liquidación | affiliate link, attribution, commission, settlement | Copias de pedidos o pagos |
| B2B | Organizaciones, equipos, proveedores, RFQ, cotizaciones y órdenes | organization, membership, RFQ, quote, purchase order | Perfiles de persona |
| Live Commerce | Sesión, transporte, espectadores, chat en vivo, producto fijado y replay | live room, provider input, live event, replay asset | Mensajes persistentes o productos |
| Logistics | Tarifas, etiquetas, tracking, incidencias y prueba de entrega | shipment, tracking event, return | Estados de pago |
| Trust & Safety | Moderación, reputación, disputas, fraude y apelaciones | case, decision, reputation signal, appeal | Reglas de acceso de identidad |
| Credi Intelligence | Señales, políticas, modelos, evaluaciones, acciones y auditoría | signal, model version, evaluation, decision, action log | Reglas de negocio opacas |
| Analytics | Métricas de producto, embudos, cohortes y SLO | event projection, metric, experiment | Fuente transaccional |

## Flujos integrados obligatorios

### Contenido → descubrimiento → compra

1. El usuario publica contenido.
2. El contenido referencia productos del catálogo canónico mediante relaciones explícitas.
3. Discovery distribuye contenido según privacidad, preferencias, seguridad y señales de calidad.
4. Una acción de compra crea checkout y orden desde el dominio Commerce.
5. El sistema registra atribución afiliada desde la orden y sus eventos, no desde parámetros confiados del navegador.
6. Pago, fulfillment, devolución y comisión se reconcilian mediante eventos idempotentes.

### Creador → LIVE → venta

1. Se crea una sala LIVE con estado `scheduled` o `provisioning`; nunca se marca `live` por crear una sala.
2. El backend provisiona credenciales efímeras y vincula el input del proveedor.
3. El estado de emisión se deriva de webhook autenticado o diagnóstico del transporte.
4. Productos fijados apuntan al catálogo canónico.
5. Chat en vivo puede tener canal de baja latencia, pero mensajes persistentes se reconcilian con Messaging.
6. El replay se enlaza al asset multimedia y a la sala, con derechos, privacidad y retención definidos.

### Empresa B2B → cotización → orden → pago

1. La organización se valida y sus miembros reciben roles por organización.
2. RFQ, quote y purchase order mantienen ciclo de aprobación auditable.
3. La orden comercial se convierte en checkout/orden transaccional mediante un servicio de dominio.
4. Pago y liquidación permanecen en Payments & Ledger.
5. Logística y disputas referencian el mismo identificador de orden.

### Credi Intelligence → decisión gobernada

1. Recibe señales mínimas y autorizadas.
2. Evalúa políticas y versión del modelo.
3. Emite recomendación o decisión con explicación, versión y confianza.
4. Las acciones sensibles requieren aprobación humana o regla explícita.
5. Registra quién autorizó, qué cambió, por qué y cómo revertirlo.
6. Nunca recibe permiso implícito para transferir fondos, cambiar roles, eliminar datos o modificar credenciales.

## Contrato común de eventos

Todo evento de dominio debe incluir como mínimo:

- `id`: identificador único del evento.
- `type`: nombre versionado, por ejemplo `commerce.order.created.v1`.
- `occurred_at`: timestamp UTC.
- `tenant_id`: organización/tenant cuando aplique.
- `actor_id`: actor autenticado o sistema.
- `aggregate_id`: entidad de origen.
- `correlation_id` y `causation_id`: trazabilidad entre flujos.
- `schema_version`: versión del contrato.
- `payload`: datos mínimos, sin secretos ni datos personales innecesarios.

Los consumidores deben ser idempotentes. Eventos críticos se publican mediante Outbox transaccional; fallos transitorios usan backoff, límite de reintentos y cola de fallidos/replay. Nunca se dispara una liquidación dos veces por recibir un webhook duplicado.

## Reglas de datos y seguridad

- PostgreSQL conserva la fuente transaccional; índices y proyecciones sirven lectura, no reemplazan la fuente.
- Cada tabla expuesta tiene RLS y pruebas de aislamiento entre usuarios/organizaciones.
- Los roles se comprueban en servidor y base de datos; ocultar botones no es autorización.
- Los identificadores enviados por cliente nunca autorizan acceso por sí solos.
- Los webhooks verifican firma, timestamp cuando el proveedor lo permita, idempotencia y replay.
- Archivos pasan validación de MIME real, tamaño, antivirus/escaneo cuando aplique y políticas de acceso.
- Datos de pago sensibles no se almacenan en tablas de aplicación si el proveedor ofrece tokenización.
- Los registros de auditoría son append-only para acciones privilegiadas y financieras.
- Retención, exportación y borrado de datos se diseñan según jurisdicción y política de privacidad.

## Reglas de experiencia de producto

- Un perfil personal puede administrar uno o más perfiles comerciales con permisos explícitos.
- El usuario no debe crear una segunda cuenta para comprar, vender, publicar o afiliarse.
- Un producto puede aparecer en catálogo, publicación, historia, reel y LIVE usando el mismo ID.
- Una orden puede originarse en feed, tienda, chat o LIVE, conservando un mismo ciclo de checkout.
- Notificaciones se generan desde eventos y preferencias del usuario, con deduplicación.
- Accesibilidad WCAG, navegación por teclado, contraste, subtítulos y responsive son criterios de aceptación.
- Publicación inmediata y programación son estados distintos; moderación no debe convertir silenciosamente una publicación inmediata en una cola de 24 horas.

## SLO y calidad mínimos

Definir SLO medidos antes de escalar:
- Disponibilidad mensual por servicio crítico.
- Latencia p50/p95/p99 de feed, búsqueda, checkout, chat y APIs.
- Tasa de error y de reintentos por proveedor.
- Tiempo de entrega de notificaciones y webhooks.
- Frescura de inventario y proyecciones.
- Tasa de éxito de reproducción y reconexión LIVE.
- Tiempo de detección y recuperación de incidentes.

Cada flujo crítico requiere unit, integration, RLS negative tests, contract tests, E2E y prueba de carga. Los despliegues se promueven solo si el mismo SHA pasa CI, Preview y build; los cambios de esquema requieren plan de rollback compatible.

## Roadmap de implementación

### P0 — Seguridad y continuidad
- Completar fail-closed de autorización, RLS y matriz de roles.
- Reconciliar historial de migraciones con producción sin borrar versiones aplicadas.
- Validar secretos y pruebas reales de cada proveedor.
- Restaurar un backup en entorno aislado y documentar RPO/RTO.
- Consolidar despliegue Vercel y eliminar automatización de despliegue Workers.

### P1 — Flujos comerciales y sociales conectados
- Certificar publicación → feed → interacción → producto → checkout → orden → pago.
- Certificar atribución afiliada, reversos y liquidación.
- Certificar organización B2B → RFQ → cotización → orden.
- Certificar chat, notificaciones, bloqueo y reportes.
- Certificar LIVE de extremo a extremo y replay.

### P2 — Inteligencia y escala
- Outbox y consumidores idempotentes para eventos críticos.
- Búsqueda y feed con métricas de relevancia y calidad.
- Analítica de cohortes y embudos.
- Credi Intelligence con evaluación continua, aprobación humana y auditoría.
- API pública versionada, webhooks para clientes y SDK.

## Definition of Done por módulo

Un módulo solo se considera terminado si:
1. Tiene alcance y propietario de dominio documentados.
2. Reutiliza entidades canónicas y no duplica sistemas.
3. Tiene migraciones, constraints e índices revisados.
4. Tiene autorización de servidor y RLS probadas.
5. Tiene validación de entrada/salida y errores estables.
6. Tiene telemetría, auditoría y límites de abuso.
7. Tiene pruebas unitarias, integración, contratos y E2E.
8. Tiene estados vacíos, carga, error, recuperación y accesibilidad.
9. Está validado en Preview y producción con datos de prueba.
10. Tiene runbook, alertas y rollback.

## Restricción explícita de plataforma

No desplegar Credi Marketplace en Cloudflare Workers u OpenNext. Mantener Vercel + Supabase como arquitectura de aplicación. Cloudflare Stream puede seguir siendo un adaptador de medios para Credi LIVE sin convertirse en runtime de la aplicación.
