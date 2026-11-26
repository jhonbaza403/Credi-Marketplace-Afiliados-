# Credi — Creadores y canales de difusión

## Perfiles de creador

Los perfiles de creador son una relación de producto con la identidad existente de `public.profiles`, no un nuevo rol global de autenticación. Un usuario mantiene una cuenta Credi y puede publicar un perfil de creador separado con handle, presentación, categoría, enlaces y controles de visibilidad.

- `creator_profiles.user_id` es la clave primaria y referencia al perfil Credi.
- La edición exige sesión y RLS obliga a que `user_id = auth.uid()`.
- El perfil público solo se consulta cuando está publicado y tiene visibilidad pública/no listada.
- Los seguidores se guardan en `creator_follows`; la API no publica el listado de seguidores.
- No existe un distintivo de verificación asignable por el propio creador. La verificación comercial continúa separada de la identidad de creador.

## Canales de difusión

Los canales son una entidad de mensajería propia, no una conversación directa ni un grupo de chat reutilizado con semántica ambigua.

- Público: aparece en el directorio y cualquiera puede consultar las publicaciones.
- No listado: se consulta mediante el enlace/handle, pero no aparece en el directorio.
- Privado: requiere invitación; no se permite la suscripción abierta.
- Las políticas `open` y `approval` controlan la suscripción pública/no listada.
- Las solicitudes pendientes solo pueden aprobarse mediante el propietario o administrador; el suscriptor no puede cambiar su propio estado a `active`.
- Propietarios y administradores pueden aprobar, silenciar, reactivar o retirar suscriptores.
- Las solicitudes pendientes solo pueden aprobarse mediante una operación autenticada del propietario/administrador; el suscriptor no puede activar su propia solicitud.
- Los propietarios y administradores pueden silenciar, reactivar o retirar suscriptores.
- El creador del canal se añade como propietario en la misma transacción de creación.
- Los posts pueden enlazar opcionalmente un producto existente; no generan una copia de producto, pedido ni inventario.
- Los posts se publican en Realtime cuando existe la publicación `supabase_realtime`; el cliente de canal actualiza la vista al recibir cambios.
- Los canales privados admiten enlaces aleatorios de un solo uso, caducidad máxima de siete días y almacenamiento únicamente del hash del token. No se almacena el enlace en texto claro.

Los helpers de autorización están en el esquema no expuesto `private`, usan `SECURITY DEFINER` con `search_path = ''` y evalúan al usuario autenticado actual. La función pública de creación de canal es `SECURITY INVOKER`; sus permisos se limitan a `authenticated`.

## Automatización gobernada

El endpoint anterior registraba una regla como ejecutada sin realizar la acción descrita. El runtime queda limitado a `notify_owner`, una notificación interna persistida en `notifications` con clave de deduplicación. Tipos de acción no implementados, incluido cualquier código arbitrario, movimiento de dinero, cambio de inventario o llamada externa, se registran como fallidos y no se marcan ejecutados.

La interfaz informa reglas evaluadas, disparadas, ejecutadas y fallidas por separado. Las URLs de acción se limitan a rutas internas para evitar redirecciones abiertas.

## Validación y límites

Esta entrega construye los contratos de perfil, seguidores y canales, junto con los endpoints y páginas de primera etapa. No implica todavía un runtime de mini-apps aislado, analítica avanzada de audiencia, carga multimedia de canal ni distribución push multicanal. Tampoco conecta proveedores de transporte o custodios externos.

La migración se valida en la reconstrucción local del workflow CI. No se aplica a Producción ni Preview hasta reconciliar ambos historiales de migración (225 y 242 versiones observadas) y aprobar la promoción.
