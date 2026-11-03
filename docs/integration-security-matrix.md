# Matriz de seguridad de integraciones Credi

**Alcance:** revisión estática de código y contratos de entorno. No se leyeron secretos, no se probaron credenciales reales y no se afirma que un proveedor esté conectado o activo.

| Integración | Configuración server-side documentada | Controles observados en código | Evidencia que falta para certificar |
|---|---|---|---|
| Supabase | URL y publishable key públicas; claves privilegiadas y DATABASE_URL solo en servidor | Clientes separados; RLS y autorización server-side como controles distintos | Prueba desde base vacía, revisión de políticas por tabla y comparación del esquema remoto/local |
| Stripe | STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET | Verificación de firma; registro/reclamación de eventos e idempotencia en flujos de webhook | Pruebas de firma inválida, evento repetido, reintento concurrente y conciliación de importe/moneda |
| Coinbase Business | API key name/secret y webhook secret | Firma HMAC con ventana temporal; validaciones de referencia, orden, importe y moneda | Pruebas de replay, duplicados, payload malformado y proveedor no disponible |
| Cloudflare Stream | Account ID, API token y webhook secret | Adaptador de Stream; firma HMAC y tolerancia temporal en el webhook LIVE | Pruebas de firma inválida, replay, evento duplicado, JSON inválido, sala inexistente y sincronización de replay |
| Twilio | Account SID y Auth Token | Credenciales definidas como variables privadas | Verificar el flujo concreto, scopes mínimos, validación de callbacks y pruebas de fallo; la variable no demuestra conexión |
| OpenAI | API key y opciones de modelo/web search | Adaptador server-only, límites de entrada/salida y timeout | Probar cuota agotada, timeout, respuesta vacía, errores 4xx/5xx y confirmar modelos habilitados |
| Gemini | API key y opciones de modelo | Adaptador server-only y límite de salida | Probar cuota agotada, timeout, respuesta vacía y disponibilidad del modelo configurado |
| Vercel | Variables protegidas del entorno de despliegue | CI y deployment gate separados | Verificar Preview READY y deployment del commit exacto; un build local no certifica Vercel |

## Reglas obligatorias para cada adaptador

1. Encapsular el proveedor detrás de un módulo de servidor y un contrato interno de Credi.
2. No exponer claves privadas en variables `NEXT_PUBLIC_*`, bundles, logs o respuestas.
3. Usar credenciales de mínimo privilegio y separar Preview de Production.
4. Verificar firmas sobre el cuerpo original del webhook, validar timestamps y rechazar eventos fuera de ventana cuando el proveedor lo soporte.
5. Validar esquema, identificadores, estado, importe y moneda antes de producir efectos de dominio.
6. Aplicar idempotencia por identificador de evento/operación y proteger los reintentos concurrentes.
7. Aplicar timeout, límites de tamaño, errores controlados y logs sin secretos ni datos sensibles innecesarios.
8. Probar éxito, firma inválida, evento repetido, replay, payload inválido, timeout, proveedor caído y recuperación.

## Estado de activación

Las variables vacías o presentes en `.env.example` solo documentan el contrato. No prueban que las credenciales estén configuradas, que el proveedor esté habilitado, ni que exista una transacción o transmisión real de extremo a extremo. La activación requiere evidencia independiente por entorno.
