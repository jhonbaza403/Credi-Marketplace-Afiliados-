# Credi LIVE — checklist de release y verificación real

**Estado de certificación:** BLOQUEADO hasta completar una emisión real y verificar su replay en un deployment Vercel Preview.

Este documento separa tres resultados que no deben confundirse:

1. **Implementación:** el adaptador, la autorización, el webhook, la recuperación y la sincronización del replay están implementados.
2. **Pruebas automatizadas:** los contratos simulados y las pruebas de código verifican el comportamiento local, pero no generan una señal de vídeo real.
3. **Certificación de transporte:** sólo se concede después de emitir desde un codificador real, reproducir desde dos clientes independientes, desconectar, reconectar, cerrar la sala y comprobar la grabación oficial.

Un CI verde, un Live Input creado o una respuesta HTTP 200 no son por sí solos evidencia de una transmisión completa.

---

## 1. Cuenta y token de Cloudflare Stream

- [ ] Confirmar que Cloudflare Stream está habilitado para la cuenta objetivo.
- [ ] Crear un token de cuenta limitado a la cuenta Credi, con los permisos mínimos:
  - [ ] **Stream Read** para listar Live Inputs, consultar estado y consultar vídeos/grabaciones.
  - [ ] **Stream Edit** para crear, actualizar, habilitar/deshabilitar entradas y rotar claves cuando sea necesario.
- [ ] Verificar el token con el endpoint de verificación de Cloudflare.
- [ ] Confirmar que el token puede listar Live Inputs.
- [ ] Crear un Live Input de prueba y consultar su estado.
- [ ] Consultar la colección de vídeos asociada a ese Input.
- [ ] Probar la rotación de claves sólo si se requiere durante la operación.
- [ ] Verificar que el token está restringido a la cuenta correcta y no tiene permisos ajenos a Stream.

**No registrar el token, sus fragmentos, cabeceras Authorization, claves RTMPS/SRT, passphrases ni respuestas que los contengan.** No incluirlos en commits, Issues, PR, artefactos E2E, capturas, logs o conversaciones.

## 2. Variables de Vercel Preview

Configurar exclusivamente en el entorno **Preview** del proyecto Vercel:

- [ ] `CLOUDFLARE_ACCOUNT_ID`
- [ ] `CLOUDFLARE_API_TOKEN`
- [ ] `CLOUDFLARE_STREAM_WEBHOOK_SECRET`

- [ ] Confirmar que las tres variables están disponibles en un deployment Preview nuevo.
- [ ] Confirmar que las variables no se han copiado a código, archivos `.env` versionados, GitHub Actions, artefactos ni comentarios.
- [ ] Mantener Production sin cambios durante esta certificación.
- [ ] Re-deployar Preview después de cambiar variables; un deployment ya creado no demuestra que haya recibido la nueva configuración.

La sesión E2E del propietario se entrega al workflow manual mediante el secreto `E2E_STORAGE_STATE_JSON`. Ese archivo de sesión es independiente de los secretos Cloudflare y nunca debe subirse como artefacto.

## 3. Webhook de Cloudflare

Endpoint de recepción de Credi:

`/api/live/cloudflare-webhook`

- [ ] Configurar en Cloudflare Notifications un destino Webhook que apunte al deployment Preview de la rama candidata.
- [ ] Configurar el secreto compartido de notificación y almacenarlo en Preview como `CLOUDFLARE_STREAM_WEBHOOK_SECRET`.
- [ ] Ejecutar Save and Test y confirmar respuesta satisfactoria.
- [ ] Activar, como mínimo, los eventos:
  - [ ] `live_input.connected`
  - [ ] `live_input.disconnected`
  - [ ] `live_input.errored`
- [ ] Verificar que el endpoint acepta el header `cf-webhook-auth`.
- [ ] Verificar el contrato HMAC `Webhook-Signature`, incluyendo la ventana de tiempo y el cuerpo original.
- [ ] Confirmar que una firma incorrecta, una firma caducada o un payload inválido no modifica la sala.

El webhook debe asociar el evento al `inputId` de la sala, conservar una secuencia temporal de transiciones y no aceptar eventos de una entrada diferente.

## 4. Sala y propietario autenticado

- [ ] Crear una sala LIVE de prueba desde el deployment Preview.
- [ ] Confirmar que el propietario existe, inicia sesión y cumple los requisitos de seguridad de cuenta.
- [ ] Provisionar un Live Input de Cloudflare desde la API autenticada de Credi.
- [ ] Confirmar que el `inputId` del proveedor coincide con `cloudflare_live_input_id` almacenado para esa sala.
- [ ] Confirmar que el modo de grabación es automático.
- [ ] Confirmar que la API de evidencia no devuelve stream keys, passphrases, tokens ni otros secretos.
- [ ] Registrar el `roomId` y el `inputId` en el registro privado de la ejecución.

Una sala creada o provisionada sin señal de un codificador permanece **preparada**, no LIVE.

## 5. Emisión real RTMPS/SRT

- [ ] Conectar un codificador real compatible con RTMPS o SRT caller.
- [ ] Iniciar una emisión de prueba con contenido autorizado.
- [ ] Confirmar que Cloudflare muestra el Input conectado.
- [ ] Confirmar que Credi recibe `live_input.connected`.
- [ ] Confirmar que la sala cambia a `live` después de esa confirmación.
- [ ] Registrar la hora UTC de conexión y el estado del proveedor.
- [ ] Verificar que HLS y DASH corresponden al Input activo.

No marcar este paso como aprobado a partir de una sala vacía, una cámara local, una URL de reproducción previa o una respuesta simulada.

## 6. Dos espectadores independientes

- [ ] Abrir la reproducción oficial en un primer navegador/dispositivo.
- [ ] Abrir la misma emisión en un segundo navegador/dispositivo independiente.
- [ ] Confirmar que ambos clientes reciben y decodifican vídeo.
- [ ] Confirmar que ambos pueden recuperar los manifiestos HLS y DASH.
- [ ] Registrar, para cada cliente, hora UTC de inicio y resultado de reproducción.
- [ ] No reutilizar la misma sesión/navegador para representar dos espectadores.

La prueba automatizada abre dos contextos de navegador independientes contra el reproductor oficial de Cloudflare y verifica la reproducción decodificada, además de recuperar los manifiestos HLS/DASH.

## 7. Desconexión y reconexión

- [ ] Cortar deliberadamente la ingestión RTMPS/SRT.
- [ ] Confirmar que Cloudflare emite `live_input.disconnected`.
- [ ] Confirmar que Credi registra la hora UTC y el estado desconectado/terminado.
- [ ] Restaurar la señal desde el codificador.
- [ ] Confirmar que Cloudflare vuelve a `connected` o `reconnected`.
- [ ] Confirmar que Credi vuelve a `live` sin crear una sala duplicada.
- [ ] Verificar que se registra una nueva hora de inicio para la ventana de emisión reconectada.
- [ ] Detener finalmente la emisión y confirmar el segundo evento `live_input.disconnected`.

La secuencia mínima verificable del historial debe ser:

`connected → disconnected → connected/reconnected → disconnected`

## 8. Replay verificable

- [ ] Esperar a que Cloudflare termine el procesamiento de la grabación.
- [ ] Consultar los vídeos desde el endpoint del mismo `inputId`.
- [ ] Reintentar la sincronización hasta que Cloudflare informe `readyToStream=true` y `status.state=ready`.
- [ ] Confirmar que el replay tiene el mismo `inputId` que la sala.
- [ ] Confirmar que existe un `videoId` oficial.
- [ ] Confirmar que `createdAt` cae dentro de la ventana UTC de la emisión/reconexión (con la tolerancia temporal documentada).
- [ ] Confirmar que la URL HLS oficial contiene ese mismo `videoId`.
- [ ] Confirmar que la URL DASH oficial contiene ese mismo `videoId`.
- [ ] Recuperar los manifiestos HLS y DASH con HTTP satisfactorio.
- [ ] Reproducir el replay desde los dos clientes independientes.
- [ ] Confirmar que la sala conserva el replay correcto y que no enlaza una grabación de otra sesión.

No aceptar un enlace genérico, una grabación anterior, un vídeo de otro Input ni una URL que no pertenezca al host oficial de Cloudflare Stream.

## 9. Evidencia de la ejecución

El workflow manual `Credi LIVE Preview E2E` genera el artefacto `live-release-evidence.json` cuando la prueba completa termina correctamente. Debe conservar:

- [ ] `roomId`
- [ ] `inputId`
- [ ] `videoId`
- [ ] `connected`, `disconnected`, `reconnected` y desconexión final con marcas de tiempo UTC
- [ ] `started_at`, inicio de la ventana reconectada y `ended_at`
- [ ] `replay.createdAt`
- [ ] URL HLS y URL DASH oficiales
- [ ] Resultado de reproducción del espectador 1 y del espectador 2
- [ ] Estado final de la sala y estado de replay

El artefacto no debe contener tokens, claves de emisión, passphrases, cabeceras de autenticación, cookies ni archivos de sesión. El archivo de sesión temporal se elimina al finalizar el workflow.

## 10. Ejecución y criterio de cierre

- [ ] Ejecutar manualmente **Actions → Credi LIVE Preview E2E → Run workflow**.
- [ ] Seleccionar el deployment URL único de Vercel Preview; Production está rechazado por el workflow.
- [ ] Introducir el `roomId` de la sala que ya completó emisión, desconexión y reconexión.
- [ ] Confirmar que el workflow termina verde y publica el artefacto de evidencia.
- [ ] Revisar que el artefacto demuestra el mismo Input, la misma sala, la misma ventana y el mismo vídeo.
- [ ] Adjuntar al PR únicamente el enlace al artefacto y el resumen sin secretos.
- [ ] Mantener la PR en borrador/no fusionable mientras falte cualquiera de estas evidencias.
- [ ] Después de aprobar Preview, preparar una verificación separada de Production con ventana de cambio, observabilidad, backups y rollback.

**Criterio de cierre LIVE:** emisión real RTMPS/SRT + eventos de webhook reales + dos espectadores independientes con vídeo decodificado + desconexión + reconexión + cierre + replay oficial verificado por Input, videoId y ventana temporal.

**No es criterio de cierre:** CI verde, build correcto, mock de webhook, sala creada, Live Input provisionado o URL de reproducción presente.

---

## Registro de la ejecución

Completar sólo con identificadores operativos no secretos y marcas de tiempo. No pegar valores de autenticación.

| Evidencia | Valor de la ejecución |
| --- | --- |
| Commit candidato | Pendiente |
| Preview deployment | Pendiente |
| Room ID | Pendiente |
| Input ID | Pendiente |
| Video ID | Pendiente |
| Connected UTC | Pendiente |
| Disconnected UTC | Pendiente |
| Reconnected UTC | Pendiente |
| Final disconnected UTC | Pendiente |
| Replay ready UTC | Pendiente |
| Viewer 1 | Pendiente |
| Viewer 2 | Pendiente |
| CI commit final | Pendiente |
| Artefacto de evidencia | Pendiente |
| Responsable / fecha de aprobación | Pendiente |
