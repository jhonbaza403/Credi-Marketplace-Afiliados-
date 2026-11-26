# Integraciones externas: Twilio y afiliados

## Estado y arquitectura
Estas integraciones son opcionales y permanecen desactivadas hasta configurar sus secretos en el entorno correspondiente. Los webhooks validan firmas antes de acceder a PostgreSQL. Las bandejas son privadas y sólo el rol de servidor puede acceder.

La aplicación sigue desplegándose en Vercel y utiliza Supabase para backend y persistencia. No se incorpora Cloudflare Workers como runtime.

## Twilio — notificación transaccional saliente
Endpoint: `POST /api/communications/sms`.

Sólo envía un texto fijo al número verificado del usuario autenticado. No permite números de destino enviados por el navegador ni mensajes libres. Requiere mismo origen, JSON, clave de idempotencia, teléfono confirmado y estas variables server-only: `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_FROM_NUMBER` y `TWILIO_STATUS_WEBHOOK_URL`.

La cuota es de tres solicitudes por usuario por hora mediante el limitador distribuido. Si el limitador falla, el envío se bloquea.

## Twilio — callbacks
Entrada: `POST /api/communications/webhooks/twilio`.
Estado: `POST /api/communications/webhooks/twilio/status`.

Ambos validan `X-Twilio-Signature` con `TWILIO_AUTH_TOKEN` y la URL HTTPS exacta definida por `TWILIO_WEBHOOK_URL` y `TWILIO_STATUS_WEBHOOK_URL`. La bandeja entrante guarda SID, estado y cantidad de medios, no números telefónicos ni el cuerpo del mensaje. Los estados de entrega se registran de forma idempotente.

## Afiliados — webhook normalizado
Endpoint: `POST /api/affiliate/webhook`. Variable: `AFFILIATE_WEBHOOK_SECRET`, distinta por entorno/partner.

Headers: `X-Credi-Timestamp` (epoch), `X-Credi-Event-Id` (ID estable) y `X-Credi-Signature: sha256=<hex>`. Firma: HMAC-SHA256 de `<timestamp>.<raw request body>`. Se rechazan timestamps fuera de cinco minutos, JSON inválido, cuerpos mayores de 256 KB, eventos fuera del esquema y reutilización del ID con un payload distinto. El endpoint almacena eventos; no acredita comisiones ni modifica balances.

Cada partner debe adaptar sus callbacks al contrato Credi. No se asume compatibilidad automática con las firmas nativas de cada proveedor.

## Persistencia privada
Migraciones: `20261126010000_external_webhook_inbox.sql` y `20261126020000_twilio_sms_delivery_tracking.sql`. Crean bandejas con RLS y revocan permisos a PUBLIC, anon y authenticated. El rol service_role conserva acceso. El test pgTAP verifica tablas, RLS, grants e índices.

## Activación por entorno
1. Revisar el catálogo/historial remoto y aplicar primero en Preview, con backup.
2. Guardar secretos sólo en el gestor de variables del entorno. No subir valores a Git ni cliente.
3. Configurar URLs HTTPS distintas para Preview y Production en Twilio.
4. Probar firmas, replay, duplicados, payload modificado, límites, concurrencia y fallos de DB.
5. Añadir consumidor de eventos afiliados. Hasta entonces, quedan en estado received.
6. Nunca acreditar wallet/comisiones directamente desde estos webhooks: usar el flujo financiero existente, conciliación y auditoría.
7. Revisar consentimiento, opt-out, jurisdicción, coste y plantillas antes de usar mensajería real.

El código y las pruebas unitarias no significan que los proveedores estén conectados ni que se hayan enviado mensajes.
