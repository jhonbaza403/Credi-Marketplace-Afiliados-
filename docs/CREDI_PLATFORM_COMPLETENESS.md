# Credi — matriz de completitud funcional

## Arquitectura que se conserva

- Vercel: aplicación Next.js y servicios de aplicación.
- Supabase: autenticación, datos, RLS, almacenamiento y Realtime.
- Cloudflare Stream: transporte y reproducción LIVE.
- Twilio: voz/vídeo donde la integración y las credenciales estén configuradas.
- No se migra la aplicación a Cloudflare Workers ni se crea una rama persistente pagada de Supabase como parte de este trabajo.

## Regla de aceptación

Un módulo solo se declara operativo cuando se comprueba su recorrido completo en un entorno real. La presencia de componentes, rutas, tablas o botones no es prueba suficiente.

## Estado de trabajo de esta rama

| Módulo | Implementación localizada / cambios de esta rama | Pendiente para declarar operativo |
|---|---|---|
| Credi Chat | Interfaz de tres paneles; búsqueda de conversaciones y mensajes; conserva mensajes, respuestas, reacciones, edición, borrado, reenvío, archivos y notas de voz; mantiene componente de llamadas; acceso a directorio y herramientas auxiliares. | Verificar dos cuentas reales, grupos, canales, presencia, entrega/lectura, notificaciones push, llamadas y videollamadas; confirmar permisos y sincronización entre dispositivos. No se simula soporte de canales si el backend no lo ofrece. |
| Marketplace | Catálogo de hasta 100 productos; búsqueda local, orden por fecha/precio/nombre y filtro de disponibilidad; tarjetas enlazan compra y contacto; accesos a servicios, Chat, LIVE, afiliados, B2B y Free. | Verificar fichas, categorías reales, paginación, carrito, checkout, inventario reservado, pagos, devoluciones y panel de vendedor con cuentas reales. |
| Muro | Feed con contenido aprobado; galería de múltiples imágenes/vídeos; interacciones de Me gusta, comentarios y compartir para publicaciones, usando las tablas/RPC ya existentes. | Verificar publicación/moderación, historias y reels de extremo a extremo, permisos de comentarios, reacciones y estadísticas. La cola de moderación sigue siendo obligatoria; no se publica contenido pendiente como si estuviera aprobado. |
| Publicar | Composer de publicación, historia, reel y publicidad; carga múltiple de hasta 10 elementos y validación de vídeo para reels. | Confirmar estado y trazabilidad de moderación, vista previa, edición/borrador, reintentos, publicación aprobada y entrega inmediata posterior a aprobación. Campañas requieren presupuesto, consentimiento y aprobación. |
| LIVE | Rutas y adaptadores de Cloudflare Stream/Twilio presentes. | Prueba real encoder → Cloudflare Stream → espectadores → recuperación/desconexión → replay. No declarar LIVE activo hasta completar esa prueba. |
| CREDI-AFFILIATE-AI | Solicitud de afiliación, panel de referidos/ventas, workspace de enlaces por producto y comisiones; copiloto de Credi AI integrado en la página del programa. | Verificar atribución real, clics y conversiones, reversos, cálculo y liquidación de comisiones, perfil fiscal, controles de cumplimiento y que el copiloto use contexto de afiliación autorizado. |
| Credi Free | Portal de entrada conectado a Muro, Marketplace, Servicios, Chat, LIVE, Publicar, Afiliados y B2B. | Probar capacidades y límites reales del plan gratuito; no presentar herramientas bloqueadas como disponibles. |
| Mercado B2B y mayoristas | Catálogo B2B verificado; editor de ofertas con multimedia y controles KYC/KYB; solicitudes RFQ, cotizaciones, selección, adjudicación y creación de pedido en servidor; ficha B2B alineada al esquema vigente y contacto con proveedor por Chat. | Probar permisos de comprador/proveedor, oferta aprobada visible, cotizaciones, adjudicación, negociación, inventario, pedido idempotente y pago real. No usar el antiguo modal de inserción directa como confirmación de compra. |
| Servicios | Directorio ampliado con enlaces a los módulos existentes del ecosistema. | Verificar que cada destino esté disponible para el rol y plan correspondiente y que no existan enlaces muertos. |

## Cambios de esta rama que requieren CI

- Catálogo Marketplace enriquecido.
- Directorio de servicios ampliado.
- Accesos de Credi Free ampliados.
- Muro: filtros de contenido aprobado, galería multimedia e interacciones de publicaciones.
- Afiliados: copiloto Credi AI integrado.
- B2B: detalle de oferta conectado al esquema `verified_b2b_products`; las tarjetas abren el detalle; navegación a abastecimiento, negociación y pedidos.
- Credi Chat: interfaz de tres columnas y búsqueda dentro de conversación.

## Pruebas obligatorias antes de producción

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run test:e2e`
5. `npm run build`
6. Pruebas manuales con dos o más cuentas y roles distintos.
7. Prueba real de LIVE y pagos en entorno de prueba.
8. Verificación de políticas RLS, moderación y aislamiento de datos.

## Bloqueos que no deben ocultarse

- Las APIs de redes externas requieren OAuth, scopes y aprobación de cada proveedor; no se debe anunciar publicación multiplataforma activa solo por existir una matriz de capacidades.
- Los contenidos sociales y las ofertas B2B permanecen sujetos a moderación y verificación. La publicación instantánea significa que el contenido aprobado se distribuye sin programación artificial; no significa saltarse controles.
- Las pruebas de producción no pueden reemplazarse por una compilación ni por una respuesta simulada.

## Hallazgos verificados en Supabase de producción (2026-10-31)

- `conversations.kind` permite actualmente `direct`, `group`, `business` y `support`; **no existe el tipo `channel`** en la restricción actual.
- La política vigente `conversation_members_insert` permite insertar la propia membresía por `user_id = auth.uid()` sin comprobar invitación o pertenencia previa. Antes de habilitar grupos/canales y exponer descubrimiento o unirse a conversaciones, debe endurecerse esa política y mover la creación/alta de miembros a un flujo servidor transaccional. No se debe habilitar el alta abierta desde el navegador.
- El esquema de `chat_live_rooms.started_at` es `NOT NULL DEFAULT now()`. El endpoint LIVE de esta rama enviaba explícitamente `started_at: null` al crear salas programadas; se corrigió omitiendo el campo para que PostgreSQL aplique el valor por defecto y `scheduled_at` conserve la hora planificada.
- La base Supabase ya registra migraciones del 2026-10-31 que no están presentes en la cabeza de la rama de esta PR. Antes de fusionar, hay que reconciliar el historial de migraciones y actualizar la rama desde `main`; no ejecutar una migración de esta rama contra producción mientras exista esa divergencia.

Estos hallazgos son bloqueos reales de seguridad/consistencia, no detalles visuales. Se mantienen visibles para evitar presentar grupos, canales o LIVE como terminados sin validación.
