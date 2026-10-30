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
