# Auditoría funcional y UX de Credi — 30 de octubre de 2026

## Alcance revisado
Se revisaron las rutas de entrada y los componentes principales de Inicio, Muro, Marketplace, Servicios, Credi Chat, Credi Free, Publicar, LIVE, Afiliados y B2B. La inspección fue estática sobre el repositorio y sus contratos de API / esquema; no se usaron credenciales reales de usuario ni se alteró la base de datos de producción.

## Hallazgo crítico: publicación multimedia
El selector de medios de publicaciones utiliza el modo \`mixed\` para aceptar imágenes y vídeos. El cargador devolvía ese modo como \`kind: "mixed"\` en el resultado del archivo; \`PublishCenter\` lo enviaba a \`/api/social/publish\` como \`type: "mixed"\`, mientras que el contrato Zod del servidor solo acepta tipos concretos de archivo. Esa incompatibilidad provocaba \`INVALID_SOCIAL_DATA\` y el mensaje genérico que veía el usuario.

### Corrección aplicada en esta rama
- El modo de selección \`mixed\` se convierte al tipo real a partir del MIME: \`image\`, \`video\` o \`audio\`.
- El helper que prepara el payload normaliza los tipos antes del POST.
- El endpoint devuelve los campos que fallan en la validación, un código y un identificador de soporte.
- Publicación de muro: se permite texto, multimedia o ambos.
- Historias: se permite texto, imagen/vídeo o ambos.
- Reels: exigen al menos un vídeo.
- Publicidad: exige título y al menos una imagen/vídeo; presupuesto y URL de destino son opcionales.
- La declaración comercial se exige para campañas publicitarias y referencias afiliadas; no bloquea publicaciones ordinarias.
- El límite del editor de publicaciones es de hasta 10 archivos; el servidor valida un máximo de 10.
- Los contenidos conservan el estado de moderación pendiente; la respuesta aclara que la campaña aún no está activa o que la pieza no aparece en el Muro hasta su aprobación.

## Acceso y experiencia
Se añade una barra de accesos rápidos para pantallas pequeñas, disponible bajo el encabezado global:
- Muro, Marketplace, Publicar, Chat y LIVE como acciones directas.
- Inicio, Servicios, Credi Free, Afiliados y B2B dentro de “Más”.
- Estado de ruta actual, etiquetas accesibles, navegación por teclado y menú compacto.

## Matriz de rutas revisadas

| Área | Ruta | Componente / función central | Estado de código |
|---|---|---|---|
| Inicio | \`/\` | Hero, accesos a ecosistema y consulta de productos | Existe |
| Muro | \`/social\` | Feed de publicaciones, historias, reels, campañas y vínculos comerciales | Existe; lectura limitada a contenido aprobado |
| Publicar | \`/publish\` | \`PublishCenter\`, cargador multimedia y API común | Corregido en esta rama; pendiente CI y prueba con sesión real |
| Marketplace | \`/marketplace\` | Consulta de productos y \`ProductCard\` | Existe |
| Servicios | \`/services\` | Directorio de servicios del ecosistema | Existe |
| Credi Chat | \`/chat\` | Directorio de contactos, chat comercial, chat LIVE y asistente IA | Existe |
| Credi Free | \`/free\` | Entrada gratuita al mismo portal y destinos compartidos | Existe |
| LIVE | \`/live\` | Gestión de salas, transporte, productos y chat LIVE | Existe; emisión real requiere validación Stream separada |
| Afiliados | \`/affiliate\` | Solicitud de acceso, panel y enlaces | Existe |
| B2B | \`/b2b\` | Marketplace B2B y entrada a publicación de ofertas | Existe |

## Verificación pendiente
- CI debe validar lint, TypeScript, pruebas unitarias, E2E y build sobre el nuevo commit.
- Hay que realizar una publicación real autenticada de cada tipo con un usuario de prueba para confirmar las inserciones y la lectura de contenido aprobado.
- La inspección estática no prueba el estado efectivo de buckets, políticas activas, moderación ni proveedores externos en producción.
- No se ejecutaron migraciones, no se modificaron secretos, no se desplegó ni se fusionó la rama.


## Continuación de auditoría de formularios — 30 de octubre de 2026

### Duplicación confirmada y retirada
- La ruta /historias ahora comparte el compositor Credi Studio con /publish; se eliminó la implementación cliente que repetía autenticación, carga multimedia y envío a la misma API.
- Se eliminó src/features/marketplace/components/CreateProductForm.tsx después de comprobar que la búsqueda de referencias del repositorio solo encontraba su definición. /products/create ya utiliza ProductPublisher.
- No se eliminaron formularios B2B o Afiliados que siguen conectados a páginas o paneles.

### Experiencia del compositor
- Vista previa dinámica para publicación, historia, reel y anuncio.
- Indicador de preparación antes de enviar y contadores de caracteres.
- La acción informa que el contenido se envía a revisión; no promete publicación pública inmediata.
- El cargador mixto muestra una acción que corresponde realmente a fotos o vídeos.

### Formularios comerciales
- ProductPublisher incorpora una ficha de vista previa que refleja portada, vídeo, título, descripción, precio, inventario y canales activos.
- El formulario B2B valida en pantalla los precios, pedido mínimo, stock, país ISO-2 y longitud de la descripción antes de enviar al servidor.
- El formulario compacto de inventario B2B se actualizó con campos accesibles y validación de nombre, precio y stock.
- AffiliateApplicationForm conserva su proceso de solicitud independiente y ahora utiliza contraste de texto coherente con el tema de la página.

### Estado verificado del commit 00679fa
- ESLint, TypeScript, pruebas unitarias y build: aprobados.
- Playwright: 62 aprobadas, 9 omitidas, ninguna fallida.
- CodeQL, Gitleaks y auditorías de seguridad/dependencias: aprobadas.
- El flujo de E2E que exige almacenamiento autenticado, identificadores de operación/sala y cuentas externas sigue necesitando credenciales y datos de prueba protegidos.
- Durante E2E se observaron errores de conexión del catálogo (TypeError: fetch failed en database.getProducts); requieren revisión de conectividad Supabase y no se consideran resueltos por el build.

No se ejecutaron migraciones, no se cambiaron secretos, no se escribió en la base de producción ni se fusionó la PR.
