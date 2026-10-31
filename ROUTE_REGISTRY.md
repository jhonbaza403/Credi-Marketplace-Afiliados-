# Registro de rutas Credi Marketplace

> Generado desde los archivos presentes en `src/app` de la rama `fix/cloudflare-live-webhook-auth`.
> La presencia de un archivo confirma que existe una implementación de ruta; **no demuestra por sí sola que el flujo esté operativo en producción**. La autorización definitiva debe comprobarse en la página, endpoint, RLS y pruebas E2E.

- Rutas de página: **104**
- Endpoints API: **93**
- Total de entradas: **197**
- Base de datos: Supabase; despliegue de aplicación previsto en Vercel; Cloudflare Stream para transporte LIVE.

| Ruta | Tipo | Protección que debe comprobarse | Rol/capacidad | Archivo |
|---|---|---|---|---|
| `/.well-known/credi-agent` | API | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/.well-known/credi-agent/route.ts` |
| `/abastecimiento` | Página | Sesión requerida; rol/capacidad según operación | Visitante / usuario | `src/app/abastecimiento/page.tsx` |
| `/abastecimiento/[id]` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/abastecimiento/[id]/page.tsx` |
| `/account` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/account/page.tsx` |
| `/account/verificacion` | Página | Sesión requerida; rol/capacidad según operación | Visitante / usuario | `src/app/account/verificacion/page.tsx` |
| `/admin` | Página | Administración; rol admin por validar | Administrador | `src/app/admin/page.tsx` |
| `/admin/compliance` | Página | Administración; rol admin por validar | Administrador | `src/app/admin/compliance/page.tsx` |
| `/admin/quality` | Página | Administración; rol admin por validar | Administrador | `src/app/admin/quality/page.tsx` |
| `/affiliate` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/affiliate/page.tsx` |
| `/affiliate-ai` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/affiliate-ai/page.tsx` |
| `/analytics` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/analytics/page.tsx` |
| `/api/admin/compliance` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/admin/compliance/route.ts` |
| `/api/affiliate` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/affiliate/route.ts` |
| `/api/agent/v1/catalog` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/agent/v1/catalog/route.ts` |
| `/api/agentic/catalog` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/agentic/catalog/route.ts` |
| `/api/agents/identity` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/agents/identity/route.ts` |
| `/api/ai` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/ai/route.ts` |
| `/api/ai/agent` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/ai/agent/route.ts` |
| `/api/ai/assistant` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/ai/assistant/route.ts` |
| `/api/ai/product-publisher` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/ai/product-publisher/route.ts` |
| `/api/analytics/predictive` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/analytics/predictive/route.ts` |
| `/api/apps/marketplace` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/apps/marketplace/route.ts` |
| `/api/apps/marketplace/[id]/install` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/apps/marketplace/[id]/install/route.ts` |
| `/api/apps/marketplace/[id]/reviews` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/apps/marketplace/[id]/reviews/route.ts` |
| `/api/automation/run` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/automation/run/route.ts` |
| `/api/b2b/access` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/b2b/access/route.ts` |
| `/api/b2b/awards/[id]/order` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/b2b/awards/[id]/order/route.ts` |
| `/api/b2b/payments/crypto` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/b2b/payments/crypto/route.ts` |
| `/api/b2b/products` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/b2b/products/route.ts` |
| `/api/b2b/rfqs` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/b2b/rfqs/route.ts` |
| `/api/b2b/rfqs/[id]/quotes` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/b2b/rfqs/[id]/quotes/route.ts` |
| `/api/b2b/rfqs/[id]/quotes/select` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/b2b/rfqs/[id]/quotes/select/route.ts` |
| `/api/billing/activate-free` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/billing/activate-free/route.ts` |
| `/api/billing/checkout` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/billing/checkout/route.ts` |
| `/api/billing/order-checkout` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/billing/order-checkout/route.ts` |
| `/api/billing/subscription` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/billing/subscription/route.ts` |
| `/api/billing/webhook` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/billing/webhook/route.ts` |
| `/api/catalog` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/catalog/route.ts` |
| `/api/chat/media` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/chat/media/route.ts` |
| `/api/chat/turn` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/chat/turn/route.ts` |
| `/api/checkout` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/checkout/route.ts` |
| `/api/commerce-events` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/commerce-events/route.ts` |
| `/api/commerce-studio/generate` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/commerce-studio/generate/route.ts` |
| `/api/compliance/document` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/compliance/document/route.ts` |
| `/api/compliance/kyb` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/compliance/kyb/route.ts` |
| `/api/compliance/kyc` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/compliance/kyc/route.ts` |
| `/api/compliance/status` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/compliance/status/route.ts` |
| `/api/compliance/upload` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/compliance/upload/route.ts` |
| `/api/credi-flex` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/credi-flex/route.ts` |
| `/api/developer/apps` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/developer/apps/route.ts` |
| `/api/developer/apps/[id]/keys` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/developer/apps/[id]/keys/route.ts` |
| `/api/developer/oauth/authorize` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/developer/oauth/authorize/route.ts` |
| `/api/developer/oauth/token` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/developer/oauth/token/route.ts` |
| `/api/developer/usage` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/developer/usage/route.ts` |
| `/api/developer/webhooks` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/developer/webhooks/route.ts` |
| `/api/disputes` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/disputes/route.ts` |
| `/api/disputes/[id]/events` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/disputes/[id]/events/route.ts` |
| `/api/disputes/[id]/evidence` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/disputes/[id]/evidence/route.ts` |
| `/api/disputes/[id]/resolve` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/disputes/[id]/resolve/route.ts` |
| `/api/escrow` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/escrow/route.ts` |
| `/api/health` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/health/route.ts` |
| `/api/intelligence/overview` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/intelligence/overview/route.ts` |
| `/api/inventory/forecast` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/inventory/forecast/route.ts` |
| `/api/live` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/live/route.ts` |
| `/api/live/chat` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/live/chat/route.ts` |
| `/api/live/cloudflare-webhook` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/live/cloudflare-webhook/route.ts` |
| `/api/live/guests` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/live/guests/route.ts` |
| `/api/live/products` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/live/products/route.ts` |
| `/api/live/stream` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/live/stream/route.ts` |
| `/api/live/twilio-token` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/live/twilio-token/route.ts` |
| `/api/locker` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/locker/route.ts` |
| `/api/marketing/campaigns` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/marketing/campaigns/route.ts` |
| `/api/marketing/campaigns/[id]` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/marketing/campaigns/[id]/route.ts` |
| `/api/marketing/campaigns/[id]/creatives` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/marketing/campaigns/[id]/creatives/route.ts` |
| `/api/markets` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/markets/route.ts` |
| `/api/negotiations` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/negotiations/route.ts` |
| `/api/negotiations/[id]` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/negotiations/[id]/route.ts` |
| `/api/negotiations/[id]/accept` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/negotiations/[id]/accept/route.ts` |
| `/api/negotiations/[id]/auto` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/negotiations/[id]/auto/route.ts` |
| `/api/operations/[operation_id]` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/operations/[operation_id]/route.ts` |
| `/api/orders` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/orders/route.ts` |
| `/api/payments` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/payments/route.ts` |
| `/api/payments/coinbase/webhook` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/payments/coinbase/webhook/route.ts` |
| `/api/payments/orchestrator` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/payments/orchestrator/route.ts` |
| `/api/payments/rails` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/payments/rails/route.ts` |
| `/api/payments/rails/confirm` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/payments/rails/confirm/route.ts` |
| `/api/payments/webhook` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/payments/webhook/route.ts` |
| `/api/product-graph/[id]` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/product-graph/[id]/route.ts` |
| `/api/products` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/products/route.ts` |
| `/api/ratings` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/ratings/route.ts` |
| `/api/risk/signal` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/risk/signal/route.ts` |
| `/api/security/passkey/sync` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/security/passkey/sync/route.ts` |
| `/api/security/profile-verification` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/security/profile-verification/route.ts` |
| `/api/social/publish` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/social/publish/route.ts` |
| `/api/stripe/connect/account-link` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/stripe/connect/account-link/route.ts` |
| `/api/stripe/connect/create-account` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/stripe/connect/create-account/route.ts` |
| `/api/stripe/connect/status` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/stripe/connect/status/route.ts` |
| `/api/v1/catalog` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/v1/catalog/route.ts` |
| `/api/v1/checkout/intent` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/v1/checkout/intent/route.ts` |
| `/api/v1/openapi` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/v1/openapi/route.ts` |
| `/api/wallet` | API | Autenticación, RLS, CSRF y permisos según endpoint | Usuario/servicio autorizado | `src/app/api/wallet/route.ts` |
| `/apps` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/apps/page.tsx` |
| `/auth/callback` | API | Flujo de autenticación | Visitante / usuario | `src/app/(auth)/auth/callback/route.ts` |
| `/auth/error` | Página | Flujo de autenticación | Visitante / usuario | `src/app/(auth)/auth/error/page.tsx` |
| `/auth/logout` | API | Flujo de autenticación | Visitante / usuario | `src/app/(auth)/auth/logout/route.ts` |
| `/automation` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/automation/page.tsx` |
| `/b2b` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/b2b/page.tsx` |
| `/b2b/[id]` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/b2b/[id]/page.tsx` |
| `/b2b/publish` | Página | Sesión requerida; rol/capacidad según operación | Empresa verificada | `src/app/(public)/b2b/publish/page.tsx` |
| `/business-os` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/business-os/page.tsx` |
| `/cart` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/cart/page.tsx` |
| `/catalog` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/catalog/page.tsx` |
| `/catalogo-video` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/catalogo-video/page.tsx` |
| `/categorias` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/categorias/page.tsx` |
| `/chat` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/chat/page.tsx` |
| `/checkout` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/checkout/page.tsx` |
| `/checkout/payment` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/checkout/payment/page.tsx` |
| `/checkout/success` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/checkout/success/page.tsx` |
| `/comercio` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/comercio/page.tsx` |
| `/commerce-studio` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/commerce-studio/page.tsx` |
| `/compras-mayoristas` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/compras-mayoristas/page.tsx` |
| `/consumer-rights` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/consumer-rights/page.tsx` |
| `/contacto` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/contacto/page.tsx` |
| `/cookies` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/cookies/page.tsx` |
| `/credi-flex` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/credi-flex/page.tsx` |
| `/dashboard` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/dashboard/page.tsx` |
| `/dashboard/admin` | Página | Sesión requerida; rol/capacidad según operación | Usuario autenticado | `src/app/dashboard/admin/page.tsx` |
| `/dashboard/affiliate` | Página | Sesión requerida; rol/capacidad según operación | Afiliado | `src/app/dashboard/affiliate/page.tsx` |
| `/dashboard/affiliate/links` | Página | Sesión requerida; rol/capacidad según operación | Afiliado | `src/app/dashboard/affiliate/links/page.tsx` |
| `/dashboard/b2b` | Página | Sesión requerida; rol/capacidad según operación | Empresa verificada | `src/app/dashboard/b2b/page.tsx` |
| `/dashboard/b2b/orders` | Página | Sesión requerida; rol/capacidad según operación | Empresa verificada | `src/app/dashboard/b2b/orders/page.tsx` |
| `/dashboard/compliance` | Página | Sesión requerida; rol/capacidad según operación | Usuario autenticado | `src/app/dashboard/compliance/page.tsx` |
| `/dashboard/orders` | Página | Sesión requerida; rol/capacidad según operación | Usuario autenticado | `src/app/dashboard/orders/page.tsx` |
| `/dashboard/profile` | Página | Sesión requerida; rol/capacidad según operación | Usuario autenticado | `src/app/dashboard/profile/page.tsx` |
| `/dashboard/reputation` | Página | Sesión requerida; rol/capacidad según operación | Usuario autenticado | `src/app/dashboard/reputation/page.tsx` |
| `/dashboard/seller` | Página | Sesión requerida; rol/capacidad según operación | Vendedor | `src/app/dashboard/seller/page.tsx` |
| `/dashboard/settings` | Página | Sesión requerida; rol/capacidad según operación | Usuario autenticado | `src/app/dashboard/settings/page.tsx` |
| `/developer` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/developer/page.tsx` |
| `/disputas` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/disputas/page.tsx` |
| `/ecosistema-avanzado` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/ecosistema-avanzado/page.tsx` |
| `/escrow` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/escrow/page.tsx` |
| `/explorar` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/explorar/page.tsx` |
| `/forgot-password` | Página | Flujo de autenticación | Visitante / usuario | `src/app/(auth)/forgot-password/page.tsx` |
| `/free` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/free/page.tsx` |
| `/gestion-empresarial` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/gestion-empresarial/page.tsx` |
| `/historias` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/historias/page.tsx` |
| `/intelligence` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/intelligence/page.tsx` |
| `/internacional` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/internacional/page.tsx` |
| `/inventario` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/inventario/page.tsx` |
| `/jobs` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/jobs/page.tsx` |
| `/jobs/create` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/jobs/create/page.tsx` |
| `/legal` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/legal/page.tsx` |
| `/legal/advertising` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/legal/advertising/page.tsx` |
| `/legal/sellers` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/legal/sellers/page.tsx` |
| `/live` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/live/page.tsx` |
| `/locker` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/locker/page.tsx` |
| `/login` | Página | Flujo de autenticación | Visitante / usuario | `src/app/(auth)/login/page.tsx` |
| `/magazines` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/magazines/page.tsx` |
| `/marketing` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/marketing/page.tsx` |
| `/marketplace` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/marketplace/page.tsx` |
| `/marketplace/products/[slug]` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/marketplace/products/[slug]/page.tsx` |
| `/mercados-conectados` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/mercados-conectados/page.tsx` |
| `/negociaciones` | Página | Sesión requerida; rol/capacidad según operación | Visitante / usuario | `src/app/negociaciones/page.tsx` |
| `/ofertas` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/ofertas/page.tsx` |
| `/orders` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/orders/page.tsx` |
| `/page.tsx` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/page.tsx` |
| `/pagos` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/pagos/page.tsx` |
| `/partners` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/partners/page.tsx` |
| `/pricing` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/pricing/page.tsx` |
| `/privacy` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/privacy/page.tsx` |
| `/product-graph` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/product-graph/page.tsx` |
| `/productos` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/productos/page.tsx` |
| `/products` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/products/page.tsx` |
| `/products/[id]` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/products/[id]/page.tsx` |
| `/products/create` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/products/create/page.tsx` |
| `/products/detail` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/products/detail/page.tsx` |
| `/proveedores-verificados` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/proveedores-verificados/page.tsx` |
| `/publish` | Página | Sesión requerida; rol/capacidad según operación | Visitante / usuario | `src/app/publish/page.tsx` |
| `/red-comercial` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/red-comercial/page.tsx` |
| `/register` | Página | Flujo de autenticación | Visitante / usuario | `src/app/(auth)/register/page.tsx` |
| `/registro` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/registro/page.tsx` |
| `/reset-password` | Página | Flujo de autenticación | Visitante / usuario | `src/app/(auth)/reset-password/page.tsx` |
| `/search` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/search/page.tsx` |
| `/security` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/security/page.tsx` |
| `/security/operations` | Página | Sesión requerida; rol/capacidad según operación | Visitante / usuario | `src/app/security/operations/page.tsx` |
| `/security/operations/[operation_id]` | Página | Sesión requerida; rol/capacidad según operación | Visitante / usuario | `src/app/security/operations/[operation_id]/page.tsx` |
| `/seller/b2b` | Página | Pública o sesión requerida según contenido y RLS | Vendedor | `src/app/seller/b2b/page.tsx` |
| `/sellers` | Página | Pública o sesión requerida según contenido y RLS | Vendedor | `src/app/(public)/sellers/page.tsx` |
| `/services` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/services/page.tsx` |
| `/servicios` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/servicios/page.tsx` |
| `/social` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/social/page.tsx` |
| `/soporte` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/soporte/page.tsx` |
| `/terms` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/terms/page.tsx` |
| `/vender` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/vender/page.tsx` |
| `/verify` | Página | Flujo de autenticación | Visitante / usuario | `src/app/(auth)/verify/page.tsx` |
| `/videos` | Página | Pública o sesión requerida según contenido y RLS | Visitante / usuario | `src/app/(public)/videos/page.tsx` |
| `/wallet` | Página | Sesión requerida; rol/capacidad según operación | Visitante / usuario | `src/app/wallet/page.tsx` |

## Reglas de cierre

1. No marcar una ruta como terminada solo porque responda HTTP 200.
2. Probar el flujo completo con usuario visitante, usuario autenticado, vendedor/empresa y administrador, según corresponda.
3. Confirmar que cada enlace del menú conduce a una ruta existente y que no hay destinos de demostración.
4. Validar políticas RLS y permisos en servidor; nunca confiar en controles de interfaz como autorización.
5. Probar errores, estados vacíos, carga, reintentos, idempotencia y accesibilidad móvil.
6. Registrar el resultado de CI, pruebas E2E y comprobación de producción antes de cambiar el estado a operativo.
