# Credi Marketplace — Auditoría de Depuración Estratégica 1.0

**Estado:** ACTIVA
**Línea:** main
**Commit auditado:** 6eba93d253205bfd22c2b7bbe3652110231e4ccf

## 1. Principio rector

Credi se optimiza consolidando una arquitectura única, contratos claros, flujos verificables, seguridad por defecto, estados explícitos y observabilidad.

> Una capacidad, una fuente de verdad, un contrato, un flujo verificable y una implementación principal.

Las rutas antiguas solo pueden existir como compatibilidad explícita y deben redirigir al destino canónico.

## 2. Capacidades protegidas

- Marketplace y Commerce.
- Orders, checkout, pagos y settlement.
- B2B y servicios profesionales.
- Afiliados.
- Stripe Connect.
- Supabase Auth, RLS y Storage.
- Credi Chat y Media.
- CREDI INTELLIGENCE.
- Wallet y Tax Engine.
- Identity/Credi ID y Reputation.
- Notifications, Security, middleware, CI/CD y Observability.
- Developer Platform/API.
- CREDI-SUPPLY AI, CREDI-CATALOG AI, CREDI-FLEX AI, CREDI-LOCKER, CREDI-ESCROW, CREDI-LIVE, CREDI-AFFILIATE AI y CREDI-AUTOMATION.

No se elimina una capacidad estratégica por simple inspección estática: se clasifica como conservar, fusionar, reconstruir, deprecar o eliminar después de verificar consumidores.

## 3. Arquitectura objetivo

GitHub → CI/Security/Tests → Vercel → Next.js modular monolith → Supabase PostgreSQL/Auth/RLS/Storage/RPC → proveedores externos mediante adaptadores.

No se introducen microservicios, Kafka, Kubernetes, Redis u otro ORM únicamente por anticipar escala.

Dominios objetivo:

- Commerce
- Orders
- Payments
- Settlement
- Taxation
- Affiliate
- B2B
- Services
- Identity
- Compliance
- Reputation
- Intelligence
- Developer Platform

## 4. Canonicalización de rutas

Clasificación obligatoria: CANONICAL, ALIAS, ACTIVE, BETA, EXPERIMENTAL, DEPRECATED o REMOVE-CANDIDATE.

Aliases actualmente identificados y válidos:

- /productos → /products
- /servicios → /services
- /categorias → /marketplace
- /explorar → /marketplace
- /ofertas → /marketplace
- /vender → /products/create
- /registro → /register
- /soporte → /services
- /dashboard/orders → /orders
- /dashboard/profile → /account
- /jobs → /services
- /seller/b2b → /b2b/publish

Estos aliases no deben contener lógica de negocio paralela.

## 5. Marketplace

Flujo empresarial objetivo:

Descubrimiento → comparación → conversación → cotización/negociación → orden → checkout → pago verificado → inventario/fulfillment → entrega → reputación → disputa/soporte → Intelligence.

Una acción visible en UI debe conducir a un estado real o permanecer explícitamente deshabilitada/no disponible.

## 6. B2B

Necesidad empresarial → RFQ → ofertas → comparación → negociación → aceptación → orden → checkout → pago → fulfillment → entrega → reputación.

Debe preservarse la trazabilidad entre RFQ, cotización, conversación y orden.

## 7. Servicios profesionales

Descubrimiento → perfil → especialidad → disponibilidad → cotización → contratación → pago → ejecución → calificación.

Identidad, reputación y cumplimiento permanecen separados de la presentación comercial.

## 8. CREDI INTELLIGENCE

CREDI INTELLIGENCE es una capa transversal, no una segunda fuente de verdad.

Los dominios siguen siendo autoridad para productos, listings, inventario, órdenes, tiendas, afiliados, reputación y B2B.

Intelligence concentra señales, inferencias, decisiones versionadas, automatizaciones, auditoría y gobernanza.

Regla: AI ≠ authority. Una inferencia de IA no sustituye una regla financiera, jurídica, de identidad, seguridad o compliance.

## 9. Design System único

Tokens mínimos: primary, secondary, background, surface, surface-secondary, foreground, muted, border, success, warning, danger, info y focus.

Componentes canónicos: Button, Input, Select, Textarea, Card, Modal, Drawer, Dropdown, Toast, Badge, Avatar, Tabs, Table, Skeleton, EmptyState, ErrorState, ConfirmDialog y Pagination.

No se permiten sistemas visuales paralelos por feature.

## 10. Estados obligatorios

Toda operación interactiva debe contemplar idle, loading, success, error, empty, disabled y retry.

Operaciones críticas añaden confirming, processing, pending, cancelled y expired.

Un pago nunca se considera exitoso por una simple redirección del frontend.

## 11. Contrato de API

HTTP → Content-Type/tamaño → CSRF/origin → parsing/validación → autenticación → autorización/ownership → rate limit → servicio de aplicación/dominio → RPC/DB → observabilidad/auditoría → respuesta tipada.

Los Route Handlers deben ser delgados.

## 12. Contrato financiero

Order → Payment Intent → Stripe → webhook verificado → idempotencia → settlement/ledger → estado de Order → comisión → payout.

Reglas: el navegador no determina el importe definitivo; webhooks verificados; deduplicación; operaciones atómicas; eventos tardíos no degradan estados terminales; trazabilidad completa.

## 13. Observabilidad

Operaciones críticas deben transportar, cuando corresponda: request_id, trace_id, user_id, tenant_id, order_id, payment_id, event_id, operation, provider, duration, outcome y error_code.

No se registran secretos, service-role keys, tokens completos ni credenciales.

## 14. Credi Health

El health de plataforma debe diferenciar disponible, degradado, no configurado, fallando y no aplicable para Database, Authentication, Storage, Payments, AI, Messaging, Media, Notifications, Email, Webhooks, Background Jobs e integraciones externas.

No se debe declarar OK únicamente porque una ruta HTTP respondió.

## 15. Seguridad

Se mantienen y refuerzan RLS, SECURITY DEFINER seguro, mínimo privilegio, CSRF/same-origin, rate limiting, validación Zod, límites de payload, idempotency keys, webhooks firmados, SSRF protection, CORS allowlist, secret hygiene, CodeQL, dependency review y secret detection.

## 16. Identidad y planes

El creador/administrador no es un plan comercial.

Modelo: creator/admin con privilegios administrativos; usuarios con plan Free o plan pagado; los privilegios comerciales derivan del plan elegido.

## 17. Criterio de eliminación

Antes de borrar un archivo o módulo se verifica: consumidores, rutas públicas, imports, navegación, llamadas API, dependencias DB/RPC, pruebas, documentación y migraciones históricas.

Solo después puede marcarse REMOVE-CANDIDATE.

## 18. Gates de calidad

Una capacidad crítica requiere lint, typecheck, unit tests, integration/domain tests, API contract tests, E2E, build, security audit, deployment verification y observability verification según corresponda.

## 19. Roadmap de consolidación

### Fase A — Foundation
Contratos, Design System, estados, observabilidad, health, arquitectura y CI.

### Fase B — Commerce Core
Catálogo, productos, carrito, checkout, órdenes, pagos, settlement e inventario.

### Fase C — B2B
RFQ, cotizaciones, negociación, conversión a orden, pagos y fulfillment.

### Fase D — Trust
Identity, Credi ID, Reputation, verificaciones, disputas y compliance.

### Fase E — Intelligence
CREDI INTELLIGENCE, CREDIT, SUPPLY, CATALOG, FLEX, ESCROW, LIVE, AFFILIATE y AUTOMATION.

### Fase F — Growth
Credi Media, afiliación avanzada, Developer Platform, automatizaciones, analítica e integraciones empresariales.

## 20. Definición empresarial de DONE

Code + Data + Security + Authorization + UX states + Observability + Tests + E2E + Documentation + Deployment = DONE.

Una pantalla sin backend funcional es NO DONE.
Una API sin autorización completa es NO DONE.
Un pago confirmado solo por frontend es NO DONE.
Una IA que ejecuta operaciones sensibles sin controles de dominio es NO DONE.

## 21. Decisión final

> Credi debe evolucionar como una infraestructura comercial digital modular, segura, observable y orientada a transacciones verificables.

El objetivo no es tener más código. Es tener menos duplicación, más coherencia, contratos explícitos, estados verificables, seguridad, trazabilidad y capacidad de evolución.