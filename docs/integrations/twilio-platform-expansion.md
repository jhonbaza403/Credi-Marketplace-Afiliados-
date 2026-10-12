# Plataforma Twilio en Credi Marketplace: mapa de integración

## Estado real
Este documento define el alcance de integración; no significa que todos los productos Twilio estén contratados, configurados ni activos. La implementación actual de esta rama cubre una base limitada de SMS y webhooks. No se deben mostrar capacidades como activas hasta pasar sus controles de configuración, pruebas y permisos.

## Principios obligatorios
- Todo acceso a Twilio se ejecuta en servidor; nunca exponer secretos en cliente, logs, commits ni respuestas HTTP.
- Usar API Keys para autenticación de llamadas salientes y Auth Token solo donde lo requiera la validación de firmas, siguiendo la documentación oficial del producto.
- Verificar firmas con el SDK oficial de Twilio y la URL pública exacta del webhook. Rechazar firmas inválidas, eventos fuera de esquema y reintentos conflictivos.
- Cada operación de envío exige autorización, consentimiento/propósito válido, límites por usuario, límites globales de coste y claves de idempotencia.
- No enviar campañas, mensajes masivos, llamadas, OTP ni correos a terceros por defecto. Exigir una acción explícita, opt-out donde corresponda y controles contra abuso.
- Persistencia privada con RLS, retención limitada, acceso mínimo y auditoría sin registrar contenido sensible innecesario.
- Los eventos de pago, pedido, afiliación o cartera nunca pueden acreditar dinero directamente desde un webhook de comunicación.
- No activar producción hasta verificar CI, E2E, migraciones, configuración del proveedor y un despliegue real.

## Catálogo de capacidades objetivo

| Dominio | Capacidades a integrar | Estado en esta rama |
|---|---|---|
| Messaging | SMS saliente, SMS entrante, MMS, RCS, WhatsApp, callbacks de entrega, plantillas | Base parcial SMS y callbacks; canales restantes pendientes |
| Verify | OTP y verificación de número mediante canales admitidos por la cuenta/país; control antifraude | Pendiente |
| Lookup | Normalización y datos disponibles de números, según país/producto contratado | Pendiente |
| Voice | Llamadas entrantes/salientes, TwiML, IVR, voz sintética/reconocimiento, grabación con consentimiento, estado de llamada | Pendiente |
| SIP / Voice infrastructure | SIP Trunking, configuración de números y enrutamiento de voz | Pendiente |
| Conversations | Conversaciones multicanal, participantes, mensajes y estados | Pendiente |
| Flex / Contact Center | Colas, agentes, tareas, asignación y panel de soporte | Pendiente; requiere diseño operativo |
| SendGrid Email | Correo transaccional, plantillas, eventos de entrega, rebotes y supresión | Pendiente; producto/cuenta separado según contratación |
| Marketing / Segment | Audiencias, perfiles, journeys y campañas cuando estén contratados | Pendiente; no activar por defecto |
| Studio | Flujos visuales de comunicaciones y atención | Pendiente |
| TaskRouter | Enrutamiento de tareas y agentes | Pendiente |
| Sync / Event Streams | Estado sincronizado y exportación de eventos según producto contratado | Pendiente |
| Observabilidad | Registro de SID, estados, errores normalizados, alertas, métricas y reconciliación | Parcial; requiere panel y alertas |
| Seguridad y cumplimiento | Consentimiento, preferencias, opt-out, cuotas, coste máximo, retención, auditoría y prevención de abuso | Pendiente de consolidación transversal |

La disponibilidad de RCS, WhatsApp, MMS, números, Verify, Voice y productos empresariales depende del país, tipo de cuenta, registro, aprobación y contratación de Twilio. No se debe asumir que un canal está habilitado por el mero hecho de existir una API.

## Orden de implementación

### Fase 1 — Base de comunicaciones (rama actual)
- Terminar y revisar SMS transaccional y estados de entrega.
- Confirmar autenticación saliente con API Key SID + API Key Secret; no usar Auth Token como contraseña de API saliente.
- Validar callbacks con el SDK oficial y URL pública canónica.
- Aplicar migración únicamente al proyecto Supabase correcto, tras resolver el estado de migraciones y verificar el diff.
- Añadir pruebas de idempotencia concurrente, errores del proveedor, rate limit y callbacks falsificados.

### Fase 2 — Preferencias, consentimiento y seguridad
- Modelo de preferencias por canal, finalidad, fecha y fuente del consentimiento.
- Lista de supresión/opt-out y bloqueo de envíos cuando aplique.
- Límites por usuario, teléfono, IP, cuenta y presupuesto; alerta y kill switch.
- Auditoría de quién solicitó cada operación y por qué, sin guardar secretos ni cuerpos sensibles.
- Retención y borrado definidos por categoría de datos.

### Fase 3 — Verify y Lookup
- Endpoints de inicio y comprobación de Verify con límites de intentos y coste.
- No crear OTP propio ni guardar códigos en texto plano.
- Lookup solo con autorización y justificación; no exponer datos personales innecesarios.

### Fase 4 — WhatsApp, MMS y RCS
- Adaptador por canal, plantillas aprobadas, webhooks de entrega y política de opt-out.
- Comprobar aprobación de remitente/plantillas y elegibilidad del país antes de habilitar.
- Sin fallback silencioso que cause cargos inesperados.

### Fase 5 — Voice
- Webhooks de llamadas firmados, TwiML validado, límites de duración y presupuesto.
- IVR y llamadas solo con finalidad válida y autorización explícita.
- Grabación desactivada por defecto; habilitar solo con avisos y cumplimiento legal aplicable.

### Fase 6 — Email y soporte
- SendGrid transaccional con autenticación de dominio, plantillas, rebotes y supresión.
- Conversations/Flex/TaskRouter solo tras definir roles de agentes, acceso a conversaciones, retención y auditoría.

### Fase 7 — Datos y automatización empresarial
- Studio, Segment, Unify/Engage, Sync y Event Streams solo si el plan de negocio y la cuenta los incluyen.
- No automatizar campañas masivas ni segmentación sensible sin una revisión específica de privacidad y consentimiento.

## Variables de entorno
Las variables se agregan por producto y por entorno en el gestor de secretos; nunca se colocan valores reales en este archivo ni en Git. Usar solo las variables que correspondan a la fase activada:
- SMS/Voice API: `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`.
- Validación de webhooks: `TWILIO_AUTH_TOKEN` y una URL pública canónica distinta por endpoint.
- SMS: `TWILIO_FROM_NUMBER`, `TWILIO_STATUS_WEBHOOK_URL`.
- Verify: `TWILIO_VERIFY_SERVICE_SID`.
- WhatsApp: remitente aprobado y plantillas configuradas en Twilio; no asumir que un número SMS sirve automáticamente.
- SendGrid: clave privada y remitente autenticado, configurados separadamente del entorno Twilio.
No crear secretos ni inventar valores para variables que todavía no se usan.

## Criterios de aceptación por capacidad
1. Feature flag apagada por defecto hasta tener credenciales y cuenta habilitadas.
2. Autorización del usuario y validación de entrada.
3. Consentimiento, opt-out y límites de coste aplicables.
4. Firma del proveedor verificada y protección contra replay/idempotencia.
5. Migración revisada y aplicada en el proyecto correcto.
6. Pruebas unitarias y E2E con mocks; pruebas reales solo en staging y con números/cuentas autorizados.
7. Alertas y métricas disponibles, sin secretos ni PII innecesaria en logs.
8. Evidencia de Preview/Production antes de marcar como activa.

## Bloqueos conocidos
- La PR #76 sigue abierta y no está fusionada.
- CI/E2E y Preview no están completamente verificados.
- Vercel reportó el límite diario de despliegues; no se puede usar un despliegue como prueba hasta que el límite se restablezca.
- El estado de migraciones Supabase requiere diagnóstico antes de aplicar una migración nueva.
- No se ha confirmado que la cuenta Twilio tenga habilitados los productos y remitentes necesarios.
