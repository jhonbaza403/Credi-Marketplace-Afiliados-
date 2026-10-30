# Credi LIVE — transporte y operación

## Arquitectura

- **Vercel / Next.js Node.js runtime:** API autenticada que provisiona y administra Live Inputs, consulta estado y sincroniza grabaciones.
- **Cloudflare Stream:** ingesta RTMPS/SRT, distribución HLS/DASH y grabación automática.
- **Supabase:** salas LIVE, estado, metadatos no secretos y enlace al replay.

No se usa Cloudflare Workers como plataforma de ejecución de Credi. Las credenciales de emisión se recuperan bajo sesión del propietario y no se escriben en la fila de la sala.

## Variables de entorno

Configurar en Vercel, como mínimo:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_STREAM_WEBHOOK_SECRET`

El token debe tener permisos de lectura y escritura de Cloudflare Stream para el Account correspondiente. Los valores nunca deben copiarse a código, commits, logs ni conversaciones.

## Activación de notificaciones LIVE

La ruta receptora es:

`https://credi-marketplace-afiliados.vercel.app/api/live/cloudflare-webhook`

En Cloudflare Dashboard:

1. Abrir **Notifications → Destinations → Webhooks** y crear un destino con la URL anterior.
2. Define un secreto para el destino genérico y guarda exactamente ese valor en Vercel como `CLOUDFLARE_STREAM_WEBHOOK_SECRET`. Cloudflare lo enviará en la cabecera `cf-webhook-auth`.
3. En **Notifications → All Notifications**, crear una notificación de producto Stream y asociar el destino.
4. Activar las notificaciones `live_input.connected` y `live_input.disconnected`; Cloudflare también puede emitir `live_input.errored` cuando detecta una incidencia. Aplicarla a todos los Live Inputs de Credi o filtrar los IDs que se quieran observar.
5. Ejecutar **Save and Test** y verificar una respuesta satisfactoria del endpoint.

La aplicación valida `cf-webhook-auth` en las notificaciones de Cloudflare y conserva compatibilidad HMAC `Webhook-Signature` para webhooks estándar de Stream; después actualiza la sala usando el cliente administrativo server-only de Supabase. La desconexión inicia la primera búsqueda del replay. Si el vídeo sigue procesándose, el Studio reintenta la sincronización cada 12 segundos mientras permanece abierto; también se puede repetir manualmente con **Sincronizar replay**.

## Protocolos y perfil recomendado

### Emisión

- **RTMPS:** opción interoperable recomendada para OBS y codificadores habituales.
- **SRT caller:** alternativa para codificadores compatibles; Stream requiere el modo caller.
- Las URLs y claves las devuelve Cloudflare y se muestran únicamente al dueño autenticado de la sala.

### Reproducción y replay

- HLS es la URL de reproducción principal de la sala.
- DASH se conserva como alternativa para reproductores compatibles.
- La grabación automática se activa en el Live Input; las grabaciones se conservan 30 días en la configuración actual.
- La sincronización sólo acepta grabaciones asociadas al Input y dentro de la ventana temporal de la sesión actual. Sólo publica el replay cuando Cloudflare informa `readyToStream=true` y `status.state=ready`.

### Perfil de emisión de Credi

Objetivo inicial: vídeo vertical 1080 × 1920, 30 FPS, H.264 y audio AAC. La resolución y el bitrate efectivos dependen del codificador, del dispositivo de captura y de la conexión; la interfaz no afirma haberlos medido ni forzado.

Cloudflare también ofrece WebRTC mediante WHIP/WHEP para emisiones de latencia subsegundo. Esta primera integración expone RTMPS/SRT como perfiles de codificador y conserva HLS/DASH y replay; el modo WebRTC queda como ampliación separada para validar su ciclo completo de publicación, reproducción y grabación antes de habilitarlo en el Studio.

## Diagnóstico y recuperación

- **Diagnosticar conexión:** consulta el estado actual del Live Input y disponibilidad de RTMPS/SRT, HLS/DASH y grabación.
- **Recuperar entrada:** vuelve a habilitar el Input deshabilitado; reinicia el Input si Cloudflare devuelve un estado terminal de conexión.
- **Sincronizar replay:** vuelve a consultar la colección de vídeos del Input y enlaza el HLS oficial al registro de la sala cuando esté listo.
- Ninguna de estas operaciones demuestra por sí sola una transmisión de extremo a extremo. Se requiere una prueba real con codificador, espectadores, cierre y replay.
