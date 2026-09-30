# Credi AI — arquitectura de producción

Credi AI usa una sola entrada de producto: /api/ai.
La clave de OpenAI permanece exclusivamente en el servidor.

## Proveedores
- OpenAI Responses API: proveedor primario.
- Gemini: fallback si OpenAI no está configurado o el proveedor primario falla.

## Enrutamiento
- copilot y sales usan gpt-6-luna.
- marketing, strategy e intelligence usan gpt-6-sol.
- OPENAI_MODEL puede seleccionar uno de los modelos permitidos.
- OPENAI_ENABLE_WEB_SEARCH=true habilita web_search para Marketing, Strategy e Intelligence.

## Seguridad
La clave se configura mediante OPENAI_API_KEY. Nunca debe utilizarse NEXT_PUBLIC_OPENAI_API_KEY ni una clave literal en TS/TSX.
Cada usuario obtiene una sesión propia en ai_sessions; el servidor conserva el response_id necesario para continuidad.
El safety_identifier se deriva mediante SHA-256 del identificador interno del usuario.
El endpoint exige autenticación, CSRF de mismo origen, rate limit, validación Zod y límites de entrada/salida.

## Capacidades
Marketplace, B2B, Servicios, Marketing, LIVE Commerce, Ventas, Inventario, Afiliados, Intelligence y Business OS.

## Seguridad operacional
Credi AI no recibe permisos implícitos para mover dinero, publicar campañas, cambiar cuentas o ejecutar operaciones irreversibles.

## Flujo
Usuario → Credi AI UI → /api/ai → autenticación/rate-limit/validación → OpenAI Responses → sesión Credi AI → respuesta.