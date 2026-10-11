# Registro de rutas — Credi Marketplace

**Estado de auditoría:** 11 de octubre de 2026  
**Rama de revisión:** `feat/route-completeness-audit`  
**Objetivo:** diferenciar páginas que existen, redirecciones válidas y webhooks que requieren integración real. La existencia de un archivo no demuestra que toda la funcionalidad esté operativa.

## Resultado sobre las 22 rutas señaladas

La auditoría del árbol del repositorio encontró archivos `page.tsx` en las 22 rutas enumeradas a continuación. Por tanto, la afirmación de que esos directorios están vacíos no coincide con el estado del código de esta rama. Aun así, deben pasar pruebas funcionales y revisión de datos/permisos.

| Ruta | Archivo detectado | Revisión funcional necesaria |
|---|---|---|
| `/apps` | `src/app/apps/page.tsx` | Confirmar que el endpoint de catálogo de apps está disponible y autorizado |
| `/business-os` | `src/app/business-os/page.tsx` | Revisar permisos y datos operativos |
| `/automation` | `src/app/automation/page.tsx` | Confirmar autorización del endpoint antes de ejecutar acciones |
| `/abastecimiento` | `src/app/abastecimiento/page.tsx` | Validar estados de carga/error y permisos RFQ |
| `/compras-mayoristas` | `src/app/compras-mayoristas/page.tsx` | Probar flujo B2B y negociación |
| `/ecosistema-avanzado` | `src/app/ecosistema-avanzado/page.tsx` | Revisar render SSR y dependencias de Supabase |
| `/gestion-empresarial` | `src/app/gestion-empresarial/page.tsx` | Verificar datos y controles por rol |
| `/mercados-conectados` | `src/app/mercados-conectados/page.tsx` | Verificar disponibilidad y permisos |
| `/negociaciones` | `src/app/negociaciones/page.tsx` | Probar lectura/escritura con autorización |
| `/proveedores-verificados` | `src/app/proveedores-verificados/page.tsx` | Verificar criterios reales de verificación; no mostrar sellos falsos |
| `/red-comercial` | `src/app/red-comercial/page.tsx` | Probar carga y enlaces de navegación |
| `/historias` | `src/app/historias/page.tsx` | Probar estados vacíos y media |
| `/commerce-studio` | `src/app/commerce-studio/page.tsx` | Revisar permisos de publicación |
| `/product-graph` | `src/app/product-graph/page.tsx` | Verificar datos y fallos de dependencias |
| `/inventario` | `src/app/inventario/page.tsx` | Revisar acceso de vendedor y consistencia de existencias |
| `/jobs` | `src/app/jobs/page.tsx` | Actualmente redirige a `/services`; confirmar que ese alias es intencional |
| `/privacy` | `src/app/privacy/page.tsx` | Página de política presente; revisión legal humana requerida |
| `/terms` | `src/app/terms/page.tsx` | Página de términos presente; revisión legal humana requerida |
| `/legal` | `src/app/legal/page.tsx` | Centro legal presente; comprobar destinos enlazados |
| `/cookies` | `src/app/cookies/page.tsx` | Política presente; comprobar que las preferencias se apliquen técnicamente |
| `/consumer-rights` | `src/app/consumer-rights/page.tsx` | Información presente; revisión por jurisdicción requerida |
| `/contacto` | `src/app/contacto/page.tsx` | Actualmente ofrece enlaces a Chat y Seguridad; no es un formulario de contacto persistente |

## Webhooks: existencia vs. integración

| Integración | Ruta | Estado de archivo | Qué falta para considerarla operativa |
|---|---|---|---|
| Stripe billing | `/api/billing/webhook` | Presente | Verificar firma, eventos idempotentes, variables Live y URL real en Stripe/Vercel |
| Cloudflare Stream | `/api/live/cloudflare-webhook` | Presente | Verificar firma/autenticidad del evento y configuración del proveedor |
| Twilio | `/api/communications/webhooks/twilio` | No detectada | Implementación segura separada: SDK oficial para validar firma, autorización, consentimiento, rate limit y controles de coste |
| Partner afiliado genérico | `/api/affiliate/webhook` | No detectada | Definir proveedor, esquema de firma, eventos e idempotencia antes de crear endpoint |

No se crean endpoints de webhook ficticios ni handlers que acepten eventos sin validar su autenticidad. La ausencia de una integración opcional se reporta como pendiente, no como éxito.

## Redirecciones

Los destinos `/services`, `/products`, `/marketplace`, `/sellers` y `/b2b` existen como rutas de Next App Router (incluidos los grupos de rutas que no aparecen en la URL). El alias `/jobs` redirige a `/services`; se conserva hasta que el producto decida si Jobs debe ser una sección independiente.

## Cómo ejecutar

```bash
npm run audit:route-completeness
npm run audit:menu
npm run audit:routes
npm run audit:api
```

Estos chequeos estáticos validan presencia y referencias; no sustituyen pruebas E2E, revisión de políticas RLS, validación real de webhooks ni confirmación de variables en Vercel. No se ha aplicado ninguna migración ni se ha publicado producción como parte de este registro.
