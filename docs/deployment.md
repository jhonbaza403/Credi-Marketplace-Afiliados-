# Credi Marketplace — Guía Profesional de Despliegue

**Next.js 16.3 · React 19.2 · React Compiler · Node.js 24 · Supabase · Cloudflare**

---

## 1. Objetivo

Esta guía establece el procedimiento recomendado para desplegar **Credi Marketplace**, una aplicación full-stack construida con:

* Next.js 16.3
* React 19.2
* React Compiler
* Node.js 24
* Supabase Auth
* Supabase PostgreSQL
* Supabase Storage
* Supabase RPC
* APIs Route Handlers de Next.js
* Integración de inteligencia artificial
* Marketplace B2C
* Mercado B2B
* Sistema de afiliados
* Checkout
* Órdenes
* Procesamiento de pagos mediante proveedores externos

La arquitectura debe separar estrictamente:

```text
CLIENTE
   │
   ▼
NEXT.JS
   │
   ├── páginas
   ├── Server Components
   ├── Client Components
   ├── Route Handlers
   └── Server Actions
   │
   ▼
SUPABASE
   ├── Auth
   ├── PostgreSQL
   ├── Storage
   └── RPC
```

Las operaciones críticas deben ejecutarse siempre en servidor.

---

# 2. Requisitos previos

Antes de desplegar, disponer de:

* Cuenta de GitHub o GitLab.
* Cuenta de Cloudflare.
* Proyecto de Supabase.
* Dominio configurado, si corresponde.
* Credenciales de Supabase.
* Clave privada del proveedor de IA.
* Credenciales de los proveedores de pago, cuando estén integrados.
* Node.js 24 para desarrollo y validación local.
* Git instalado.
* Proyecto correctamente compilable con:

```bash
npm run build
```

---

# 3. Compatibilidad de Node.js

El proyecto utiliza:

```text
Node.js 24
```

La versión utilizada localmente debe coincidir con la versión configurada en CI/CD y en el entorno de despliegue siempre que la plataforma lo permita.

Se recomienda declarar explícitamente la versión en `package.json`:

```json
{
  "engines": {
    "node": "24.x"
  }
}
```

También puede utilizarse `.nvmrc`:

```text
24
```

La versión debe verificarse antes de cada despliegue:

```bash
node --version
npm --version
```

---

# 4. Instalación y validación local

Clonar el proyecto:

```bash
git clone <REPOSITORY_URL>
cd <PROJECT_DIRECTORY>
```

Instalar dependencias:

```bash
npm ci
```

Ejecutar el entorno de desarrollo:

```bash
npm run dev
```

Antes de desplegar:

```bash
npm run lint
npm run build
```

Si el proyecto utiliza TypeScript estricto, cualquier error de compilación debe corregirse antes del despliegue.

---

# 5. Arquitectura de variables de entorno

## 5.1 Variables públicas

Estas variables pueden utilizarse en componentes cliente cuando la arquitectura de Supabase así lo requiera:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA
```

Estas variables **no deben contener secretos administrativos**.

---

# 6. Variables exclusivamente servidor

Las siguientes variables nunca deben utilizarse con el prefijo:

```text
NEXT_PUBLIC_
```

Ejemplo:

```env
GEMINI_API_KEY=...
```

Nunca:

```env
NEXT_PUBLIC_GEMINI_API_KEY=...
```

La clave de Gemini debe permanecer exclusivamente en el servidor.

---

## 6.1 Supabase

Cuando una operación requiera privilegios administrativos, utilizar una variable exclusivamente servidor:

```env
SUPABASE_SERVICE_ROLE_KEY=...
```

### ADVERTENCIA CRÍTICA

`SUPABASE_SERVICE_ROLE_KEY`:

* No debe aparecer en componentes cliente.
* No debe comenzar por `NEXT_PUBLIC_`.
* No debe enviarse al navegador.
* No debe almacenarse en el repositorio.
* No debe aparecer en logs.
* No debe enviarse como respuesta de una API.

Esta clave tiene privilegios elevados y debe utilizarse únicamente cuando exista una razón arquitectónica concreta.

Siempre que sea posible, las operaciones normales deben utilizar el contexto autenticado del usuario y las políticas RLS.

---

# 7. Variables de inteligencia artificial

Para el asistente:

```env
GEMINI_API_KEY=TU_CLAVE_PRIVADA
GEMINI_MODEL=gemini-2.5-flash
```

La clave solo debe ser accesible desde:

```text
src/app/api/ai/*
```

o desde servicios de servidor.

Nunca desde:

```text
'use client'
```

---

# 8. Variables de pagos

Cuando se incorporen proveedores de pago, todas las credenciales privadas deberán permanecer exclusivamente en servidor.

Ejemplo:

```env
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

Para Binance Pay:

```env
BINANCE_PAY_API_KEY=...
BINANCE_PAY_SECRET_KEY=...
BINANCE_PAY_CERTIFICATE=...
```

Los nombres exactos dependerán del proveedor finalmente seleccionado.

Nunca utilizar:

```env
NEXT_PUBLIC_STRIPE_SECRET_KEY
NEXT_PUBLIC_BINANCE_PAY_SECRET_KEY
```

---

# 9. Variables de aplicación

Las variables generales pueden incluir:

```env
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

Para producción:

```env
NODE_ENV=production
```

No se deben introducir valores sensibles dentro de variables públicas.

---

# 10. Base de datos

## Regla fundamental

La aplicación no debe depender de una conexión directa desde el navegador hacia PostgreSQL.

La arquitectura recomendada es:

```text
Browser
   │
   ▼
Next.js
   │
   ▼
Supabase
   │
   ▼
PostgreSQL
```

Las operaciones complejas y sensibles deben utilizar:

* Supabase RPC.
* Route Handlers.
* Server Actions.
* funciones PostgreSQL.
* RLS.

---

# 11. DATABASE_URL

No agregar automáticamente:

```env
DATABASE_URL=postgresql://...
```

a las variables de Cloudflare.

Solo debe utilizarse si existe una dependencia real que requiera una conexión PostgreSQL directa desde el servidor.

Para Credi Marketplace, las operaciones de negocio deben preferentemente utilizar Supabase y RPC.

Si posteriormente se incorpora un ORM como Prisma, Drizzle u otra capa de acceso directo a PostgreSQL, entonces deberá definirse específicamente la estrategia de conexión compatible con el runtime elegido.

---

# 12. Seguridad de Supabase

Las tablas críticas deben utilizar Row Level Security.

Como mínimo:

```text
profiles
products
orders
b2b_products
b2b_orders
affiliate relationships
payments
```

deben analizarse individualmente para determinar:

* SELECT permitido.
* INSERT permitido.
* UPDATE permitido.
* DELETE permitido.

Nunca debe asumirse que ocultar una ruta del frontend constituye seguridad.

La seguridad real debe estar en:

```text
RLS
+
PostgreSQL
+
RPC
+
Server-side authorization
```

---

# 13. Órdenes

La creación de órdenes debe seguir:

```text
Cliente
   │
   ▼
POST /api/orders
   │
   ▼
Autenticación Supabase
   │
   ▼
Validación
   │
   ▼
RPC PostgreSQL
   │
   ├── bloqueo de producto
   ├── validación de stock
   ├── precio real
   ├── cantidad
   ├── afiliado
   ├── creación de orden
   └── reserva/descuento de inventario
```

Nunca confiar en:

```text
price
total
stock
seller_id
buyer_id
status
```

enviados desde el navegador.

---

# 14. Pagos

Una orden no debe convertirse en:

```text
completed
```

porque el navegador haya presionado un botón.

El flujo correcto será:

```text
Crear orden
     │
     ▼
pending
     │
     ▼
Crear intención/sesión de pago
     │
     ▼
Proveedor de pago
     │
     ▼
Webhook
     │
     ▼
Verificación criptográfica
     │
     ▼
Confirmación servidor
     │
     ▼
paid / completed
```

El webhook será la fuente de verdad del pago.

---

# 15. Cloudflare

Antes de elegir Cloudflare Pages como plataforma definitiva debe verificarse que la configuración concreta soporte correctamente todas las capacidades utilizadas por la aplicación:

* Next.js 16.3.
* Route Handlers.
* Runtime Node.js.
* APIs server-side.
* Variables de entorno.
* Middleware/proxy.
* Supabase SSR.
* Streaming, si se utiliza.
* Webhooks.
* Integraciones externas.

Si una función requiere APIs completas de Node.js o compatibilidad específica de runtime, debe evaluarse Cloudflare Workers/Pages frente a un entorno Node.js completo.

No debe asumirse compatibilidad únicamente porque el frontend compile.

---

# 16. Configuración de producción

En Cloudflare se deben configurar por separado:

```text
Production
Preview
```

Las variables de producción nunca deben copiarse indiscriminadamente a previews.

Ejemplo:

```text
Production
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY
    GEMINI_API_KEY
    GEMINI_MODEL
    NEXT_PUBLIC_APP_URL
    PAYMENT_SECRETS

Preview
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY
    GEMINI_API_KEY
    GEMINI_MODEL
    NEXT_PUBLIC_APP_URL
```

Preferiblemente, Preview debe utilizar un proyecto Supabase separado.

---

# 17. Dominio

Configurar:

```text
https://www.tudominio.com
```

y/o:

```text
https://tudominio.com
```

La URL canónica debe definirse claramente.

Ejemplo:

```env
NEXT_PUBLIC_APP_URL=https://tudominio.com
```

No utilizar:

```text
http://
```

en producción.

---

# 18. HTTPS

Toda la aplicación debe ejecutarse mediante HTTPS.

Las cookies de autenticación deben utilizar las propiedades de seguridad apropiadas:

```text
Secure
HttpOnly
SameSite
```

La configuración exacta dependerá del mecanismo de autenticación utilizado por Supabase SSR.

---

# 19. Headers de seguridad

La aplicación debe implementar las cabeceras de seguridad desde la configuración real de Next.js o desde la capa Edge/CDN.

Como mínimo:

```text
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security
Permissions-Policy
```

No utilizar:

```text
X-XSS-Protection
```

como mecanismo moderno de seguridad.

---

# 20. Content Security Policy

La CSP debe configurarse cuidadosamente.

No copiar una política genérica sin analizar:

* Next.js.
* Supabase.
* imágenes.
* fuentes.
* Analytics.
* Gemini.
* proveedores de pago.
* CDN.
* scripts externos.

Una CSP demasiado restrictiva puede romper funcionalidades legítimas.

Una CSP demasiado permisiva:

```text
script-src 'unsafe-inline' *
```

reduce considerablemente la protección.

La CSP definitiva debe construirse a partir de los dominios realmente utilizados por Credi Marketplace.

---

# 21. Caché

Los assets generados por Next.js pueden utilizar:

```text
Cache-Control:
public, max-age=31536000, immutable
```

para recursos versionados de:

```text
/_next/static/*
```

Las respuestas dinámicas y las APIs de negocio deben evitar caché público accidental.

Especialmente:

```text
/api/orders/*
/api/checkout/*
/api/payments/*
/api/ai/*
```

deben tratarse como datos dinámicos y sensibles.

---

# 22. IA

El endpoint:

```text
/api/ai/assistant
```

debe:

* validar el cuerpo.
* limitar tamaño del mensaje.
* utilizar únicamente `GEMINI_API_KEY`.
* aplicar timeout.
* controlar errores.
* evitar exponer secretos.
* registrar `request_id`.
* evitar almacenar información sensible innecesaria.

La IA no debe tener acceso directo e ilimitado a PostgreSQL.

La arquitectura futura recomendada es:

```text
AI
 │
 ├── consultar_producto()
 ├── consultar_stock()
 ├── consultar_orden()
 ├── consultar_politica()
 └── consultar_b2b()
```

mediante herramientas explícitamente autorizadas.

Nunca:

```text
AI → SQL directo → producción
```

---

# 23. Build de producción

Antes del despliegue:

```bash
npm ci
npm run lint
npm run build
```

Si todo es correcto:

```text
✓ TypeScript
✓ React
✓ Next.js
✓ Server Components
✓ Client Components
✓ Route Handlers
✓ Build production
```

El despliegue no debe realizarse mientras existan errores de compilación.

---

# 24. Verificación posterior al despliegue

Después del despliegue comprobar:

## Aplicación

```text
/
 /marketplace
 /b2b
 /cart
 /checkout
 /dashboard
```

## Autenticación

```text
registro
login
logout
refresh de sesión
rutas protegidas
```

## Marketplace

```text
productos
stock
carrito
checkout
```

## B2B

```text
catálogo
producto B2B
MOQ
stock
checkout B2B
```

## API

```text
/api/orders
/api/checkout
/api/ai/assistant
```

## Seguridad

Comprobar que:

```text
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
PAYMENT_SECRET_KEYS
```

nunca aparezcan en:

```text
HTML
JavaScript del navegador
logs públicos
Git
responses JSON
```

---

# 25. Verificación de secretos

Antes de realizar:

```bash
git push
```

comprobar:

```bash
git status
```

y revisar:

```text
.env
.env.local
.env.production
```

Nunca subir:

```text
.env
.env.local
.env.production
```

al repositorio cuando contengan secretos.

El `.gitignore` debe incluir:

```gitignore
.env
.env.*
!.env.example
```

---

# 26. Archivo .env.example

El repositorio debe contener únicamente una plantilla:

```env
NEXT_PUBLIC_APP_URL=https://example.com

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

BINANCE_PAY_API_KEY=
BINANCE_PAY_SECRET_KEY=
```

Nunca colocar valores reales.

---

# 27. Git y CI/CD

El flujo recomendado:

```text
feature/*
    │
    ▼
Pull Request
    │
    ├── lint
    ├── typecheck
    ├── build
    └── security checks
    │
    ▼
main
    │
    ▼
Production
```

Las modificaciones directas sobre producción deben evitarse.

---

# 28. Migraciones de Supabase

Las modificaciones de base de datos deben mantenerse versionadas.

Ejemplo conceptual:

```text
supabase/
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_profiles.sql
    ├── 003_products.sql
    ├── 004_orders.sql
    ├── 005_affiliates.sql
    ├── 006_b2b.sql
    └── 007_order_rpc.sql
```

Nunca modificar producción manualmente sin registrar posteriormente el cambio en las migraciones.

---

# 29. Principio de fuente de verdad

Para operaciones financieras:

```text
Browser ≠ fuente de verdad
```

La fuente de verdad debe ser:

```text
PostgreSQL
+
RPC
+
Payment Provider
+
Webhook verificado
```

El frontend solamente presenta información.

---

# 30. Checklist de producción

Antes de marcar el proyecto como producción:

```text
[ ] Node.js 24 configurado
[ ] Next.js 16.3 compilando correctamente
[ ] React 19.2 funcionando
[ ] React Compiler configurado correctamente
[ ] Supabase Auth funcionando
[ ] RLS activado
[ ] RPC de órdenes probado
[ ] Stock protegido contra race conditions
[ ] Precio validado en servidor
[ ] Checkout validado en servidor
[ ] Webhooks configurados
[ ] Pagos verificados desde servidor
[ ] GEMINI_API_KEY protegida
[ ] SUPABASE_SERVICE_ROLE_KEY protegida
[ ] Variables de entorno separadas entre Preview y Production
[ ] HTTPS activo
[ ] Headers de seguridad activos
[ ] Caché revisada
[ ] API sin caché público accidental
[ ] Logs sin secretos
[ ] .env excluido de Git
[ ] Build de producción exitoso
[ ] Dominio personalizado funcionando
[ ] Supabase Redirect URLs configuradas
[ ] CORS revisado
[ ] Recuperación de errores probada
[ ] Rutas protegidas probadas
[ ] Checkout probado con stock concurrente
[ ] Pago probado mediante webhook
```

---

# 31. Arquitectura definitiva

La arquitectura objetivo de Credi Marketplace debe aproximarse a:

```text
                         INTERNET
                            │
                            ▼
                    CLOUDFLARE / EDGE
                            │
                            ▼
                     NEXT.JS 16.3
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
       FRONTEND          API SERVER          AI
          │                 │                 │
          │                 │                 ▼
          │                 │              GEMINI
          │                 │
          │                 ▼
          │             SUPABASE
          │                 │
          │       ┌─────────┼─────────┐
          │       ▼         ▼         ▼
          │      AUTH    POSTGRES   STORAGE
          │                 │
          │                 ▼
          │                RPC
          │                 │
          │       ┌─────────┼──────────┐
          │       ▼         ▼          ▼
          │     Orders    Stock      Affiliates
          │
          ▼
       Browser
```

## Regla arquitectónica fundamental

> **El navegador solicita; el servidor valida; PostgreSQL decide; el proveedor de pagos confirma; el webhook certifica; y la interfaz solamente representa el estado verdadero del sistema.**

Esta regla debe mantenerse en todo el proyecto.

---

## 32. Resultado esperado

Un despliegue correctamente configurado debe proporcionar:

```text
Next.js 16.3
        +
React 19.2
        +
React Compiler
        +
Node.js 24
        +
Supabase
        +
Cloudflare
        +
IA
        +
Marketplace
        +
B2B
        +
Afiliados
        +
Checkout
        +
Pagos
```

sin colocar secretos en el cliente y sin confiar en datos financieros enviados desde el navegador.
