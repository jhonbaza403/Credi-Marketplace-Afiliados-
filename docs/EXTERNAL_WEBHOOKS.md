# Webhooks externos: Twilio y afiliados

## Alcance
Se agregan dos endpoints con firma obligatoria y bandejas privadas de eventos idempotentes. No se activan envíos salientes, no se liquidan comisiones y no se configuran secretos de producción. Los eventos quedan en estado `received` hasta que un consumidor de negocio revisado los procese.

## Twilio: mensajes entrantes
Endpoint: `POST /api/communications/webhooks/twilio`

Variables de servidor: `TWILIO_AUTH_TOKEN` y `TWILIO_WEBHOOK_URL`. La segunda debe ser la URL HTTPS pública exacta configurada en Twilio, con la query string si existe. Twilio envía el formulario URL-encoded y el encabezado `X-Twilio-Signature`; el endpoint valida la firma con el Auth Token y los parámetros recibidos. Si faltan secretos o la firma es incorrecta, rechaza el evento. Guarda SID, estado y cantidad de medios, no teléfonos ni cuerpo del mensaje.

Configura el webhook de mensajes entrantes de Twilio con esa URL exacta. Nunca expongas el Auth Token ni lo incluyas en logs.

## Afiliados externos: contrato normalizado Credi
Endpoint: `POST /api/affiliate/webhook`. Variable server-only: `AFFILIATE_WEBHOOK_SECRET`, distinta por entorno/proveedor.

Headers:
- `X-Credi-Timestamp`: Unix epoch en segundos.
- `X-Credi-Event-Id`: ID estable y único.
- `X-Credi-Signature`: `sha256=<hex>`.

Firma: HMAC-SHA256 de `<timestamp>.<raw request body>` en UTF-8. Se rechazan firmas incorrectas, timestamps con más de cinco minutos, JSON inválido, cuerpos de más de 256 KB, eventos fuera de esquema e IDs cuyo payload cambie.

Ejemplo de payload:
```json
{"id":"evt_01JEXAMPLE","type":"affiliate.conversion.pending","occurredAt":"2026-10-11T12:00:00.000Z","data":{"externalConversionId":"conv_example","campaignRef":"campaign_example"}}
```
Cada partner debe adaptar sus callbacks nativos a este contrato; no se asume compatibilidad automática con firmas de otros proveedores.

## Antes de activar
1. Revisar y aplicar `supabase/migrations/20261011010000_external_webhook_inbox.sql` en el entorno correcto, con backup.
2. Cargar los secretos desde el gestor de variables del despliegue; nunca en Git o código de cliente.
3. Configurar URLs HTTPS separadas para Preview y Production.
4. Probar firma correcta/incorrecta, replay, duplicados, payload modificado y fallo de base de datos.
5. Añadir rate limiting en el borde, alertas y consumidor idempotente.
6. No modificar wallet ni acreditar comisiones desde el webhook. Las conversiones deben pasar por el flujo financiero existente, con reconciliación y auditoría.
7. Mensajería saliente requiere flujo separado con consentimiento, opt-out, autorización, rate limit y límites de coste. Esta implementación no envía mensajes ni genera cargos.
