# Twilio SMS: configuración y verificación

## Variables privadas en Vercel
- `TWILIO_ACCOUNT_SID`: Account SID del proyecto Twilio.
- `TWILIO_API_KEY_SID`: API Key SID (prefijo `SK`), solo server-side; autentica las llamadas salientes.
- `TWILIO_API_KEY_SECRET`: API Key Secret correspondiente, solo server-side; nunca se comparte ni se sube al repositorio.
- `TWILIO_AUTH_TOKEN`: Auth Token de la cuenta, solo server-side; se utiliza para validar las firmas de los webhooks, no como contraseña de la API saliente.
- `TWILIO_FROM_NUMBER`: número Twilio habilitado para SMS en formato E.164.
- `TWILIO_STATUS_WEBHOOK_URL`: URL pública HTTPS exacta `https://<dominio>/api/communications/webhooks/twilio/status`.
- `TWILIO_WEBHOOK_URL`: URL exacta del endpoint de mensajes entrantes existente, si se usa.

No añadas credenciales reales al repositorio. Configura variables para Preview y Production por separado y redepliega después de cambiarlas.

## Flujo
- `POST /api/communications/sms` requiere sesión Supabase y número de teléfono confirmado en Auth. Envía solo un mensaje transaccional fijo al propio usuario; máximo 3 solicitudes por usuario/hora y clave de idempotencia UUID.
- Twilio envía los callbacks a `POST /api/communications/webhooks/twilio/status`. El endpoint valida `X-Twilio-Signature`, registra eventos idempotentes y actualiza el estado.
- La respuesta HTTP 202 significa que Twilio aceptó la solicitud, no que el SMS ya se entregó. La entrega se confirma mediante el callback.

## Prueba segura
1. Aplicar la migración `20261012030000_twilio_sms_delivery_tracking.sql` al proyecto Supabase correcto.
2. Añadir `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` y `TWILIO_STATUS_WEBHOOK_URL` como variables privadas en Vercel Preview y Production.
3. Confirmar que el número remitente está habilitado y registrado/verificado según país, tipo de número y caso de uso.
4. Probar primero en Preview con un teléfono propio verificado y consentimiento para recibir el mensaje.
5. Verificar que el SID queda en `twilio_sms_requests` y los callbacks en `twilio_message_status_events`. Comprobar `delivered` o el código de error terminal.
6. No promover a Production hasta que CI, build, migración y callback estén verificados.

Las tablas no son accesibles desde `anon` ni `authenticated`; solo el cliente administrativo de servidor puede escribirlas. El endpoint no acepta números de terceros ni contenido arbitrario.
