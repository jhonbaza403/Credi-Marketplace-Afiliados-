# Credi Marketplace

Plataforma de marketplace orientada a producción para comercio electrónico, vendedores, afiliados, operaciones B2B, servicios, pagos y administración.

La aplicación está construida con:

* Next.js 16 App Router
* React 19
* TypeScript
* Tailwind CSS 4
* Supabase
* Vercel
* Vitest
* Playwright

El proyecto está diseñado bajo principios de **seguridad server-side, mínimo privilegio, validación de entradas, Row Level Security (RLS), idempotencia y defensa en profundidad**.

---

# Runtime

Versiones objetivo del proyecto:

| Tecnología   |     Versión |
| ------------ | ----------: |
| Node.js      | 24.20.0 LTS |
| npm          |        11.x |
| Next.js      |      16.3.3 |
| React        |      19.2.8 |
| React DOM    |      19.2.8 |
| TypeScript   |       7.0.2 |
| Tailwind CSS |       4.3.3 |

La versión de Node.js debe mantenerse alineada con `.nvmrc` y con el entorno utilizado para CI/CD y producción.

---

# Architecture

Credi Marketplace utiliza una arquitectura modular basada en Next.js App Router.

```text
Browser
   │
   ▼
Next.js App Router
   │
   ├── Server Components
   ├── Client Components
   ├── Server Actions / Route Handlers
   ├── Authentication
   └── Authorization
          │
          ▼
      Supabase
          │
          ├── Auth
          ├── PostgreSQL
          ├── RLS
          ├── RPC
          └── Storage
```

La autorización sensible no depende exclusivamente del navegador.

Las operaciones protegidas deben verificarse en el servidor y, cuando corresponda, mediante políticas RLS de Supabase.

---

# Main Capabilities

El proyecto contempla los siguientes módulos:

* Autenticación
* Recuperación de cuenta
* Perfiles
* Roles y permisos
* Marketplace
* Productos
* Vendedores
* Tiendas
* Carrito
* Checkout
* Órdenes
* Inventario
* Pagos
* Webhooks
* Afiliados
* Comisiones
* Servicios profesionales
* B2B
* Notificaciones
* Jobs
* Auditoría
* Analítica
* Administración

---

# Project Structure

Estructura principal:

```text
credi-marketplace/
│
├── .github/
│   └── workflows/
│
├── public/
│
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── page.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── products/
│   │   │   ├── sellers/
│   │   │   ├── recommendations/
│   │   │   └── webhooks/
│   │   │
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── admin/
│   │   │       └── page.tsx
│   │   │
│   │   ├── globals.css
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminDashboard.tsx
│   │   │
│   │   └── dashboard/
│   │       └── DashboardPage.tsx
│   │
│   ├── context/
│   │
│   ├── lib/
│   │   ├── auth/
│   │   ├── supabase/
│   │   ├── storage/
│   │   ├── cache/
│   │   ├── logging/
│   │   └── utils/
│   │
│   ├── services/
│   │
│   ├── types/
│   │
│   ├── utils/
│   │
│   └── proxy.ts
│
├── supabase/
│   ├── migrations/
│   ├── tests/
│   │   └── integration/
│   └── config.toml
│
├── tests/
│   ├── unit/
│   └── e2e/
│
├── docs/
│
├── .env.example
├── .env.local
├── .gitignore
├── .nvmrc
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── playwright.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── SECURITY.md
└── README.md
```

---

# App Router

Credi Marketplace utiliza exclusivamente **Next.js App Router**.

Las rutas principales incluyen:

```text
/admin
/dashboard
/dashboard/admin
```

Las rutas administrativas deben utilizar autorización server-side.

Ejemplo conceptual:

```text
requireAdmin()
```

La protección de la interfaz no sustituye la protección de las APIs ni de la base de datos.

---

# Dashboard Administration

El dashboard administrativo principal se encuentra en:

```text
src/components/admin/AdminDashboard.tsx
```

Las rutas administrativas pueden utilizarlo mediante:

```tsx
import { AdminDashboard } from "@/components/admin/AdminDashboard";
```

o mediante exportación default, siempre que la importación y exportación sean consistentes.

Por ejemplo:

```tsx
export default function AdminDashboard() {
  return (
    // ...
  );
}
```

debe importarse como:

```tsx
import AdminDashboard from "@/components/admin/AdminDashboard";
```

Mientras que:

```tsx
export function AdminDashboard() {
  return (
    // ...
  );
}
```

debe importarse como:

```tsx
import { AdminDashboard } from "@/components/admin/AdminDashboard";
```

No se deben mezclar ambos patrones accidentalmente.

---

# Supabase

Supabase proporciona la infraestructura principal de backend y base de datos.

Se utiliza para:

* Authentication
* PostgreSQL
* Row Level Security
* RPC
* Storage
* Webhooks e integraciones
* Persistencia de datos

Estructura:

```text
supabase/
├── migrations/
├── tests/
│   └── integration/
└── config.toml
```

Las migraciones deben mantenerse versionadas.

No se deben modificar manualmente migraciones ya aplicadas en producción sin un procedimiento controlado.

---

# Row Level Security

RLS es obligatorio para las tablas que contienen datos protegidos.

Las políticas deben seguir el principio de mínimo privilegio.

La aplicación no debe confiar únicamente en:

```text
React
Client Components
UI
hidden buttons
frontend checks
```

La seguridad debe aplicarse mediante capas:

```text
Authentication
      ↓
Authorization
      ↓
Server-side validation
      ↓
Supabase RLS
      ↓
Database constraints
```

---

# Authentication

La autenticación se gestiona mediante Supabase Auth.

Las operaciones autenticadas deben comprobar la sesión cuando el recurso lo requiera.

Autenticación y autorización son conceptos diferentes:

```text
Authentication
¿Quién es el usuario?

Authorization
¿Qué puede hacer ese usuario?
```

Los permisos administrativos deben comprobarse server-side.

---

# Environment Variables

Las variables públicas pueden utilizar el prefijo:

```text
NEXT_PUBLIC_
```

Los secretos **nunca** deben utilizar ese prefijo.

Ejemplo:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Variables exclusivamente server-side:

```text
SUPABASE_SECRET_KEY=...
SUPABASE_JWKS_URL=...
DATABASE_URL=...
GEMINI_API_KEY=...
```

Nunca deben publicarse secretos en:

* Git;
* GitHub;
* GitLab;
* Issues;
* Pull Requests;
* código frontend;
* logs públicos;
* archivos JavaScript enviados al navegador.

---

# Local Environment

Crear:

```text
.env.local
```

para desarrollo local.

Ejemplo:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Credi Marketplace
NEXT_PUBLIC_DEFAULT_LOCALE=es
NEXT_PUBLIC_DEFAULT_CURRENCY=VES
NEXT_PUBLIC_DEFAULT_COUNTRY=VE
NEXT_PUBLIC_ENV=development

SUPABASE_SECRET_KEY=
SUPABASE_JWKS_URL=

DATABASE_URL=
GEMINI_API_KEY=
```

Los valores reales no deben incluirse en este README.

---

# Installation

## 1. Instalar Node.js

Utilizar Node.js:

```text
24.20.0
```

Si se utiliza `nvm`:

```bash
nvm use
```

Verificar:

```bash
node --version
npm --version
```

---

## 2. Instalar dependencias

Si todavía no existe `package-lock.json`:

```bash
npm install
```

Esto genera el lockfile correspondiente al `package.json`.

Una vez generado y versionado:

```bash
npm ci
```

debe utilizarse para instalaciones reproducibles en CI/CD.

No se debe editar manualmente:

```text
package-lock.json
```

---

# Development

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible normalmente en:

```text
http://localhost:3000
```

También existe el script de desarrollo con Turbopack:

```bash
npm run dev:turbo
```

---

# TypeScript

El proyecto utiliza TypeScript en modo estricto.

Comprobar tipos:

```bash
npm run typecheck
```

No se deben solucionar errores de TypeScript mediante:

```text
any
@ts-ignore
@ts-expect-error
```

sin una justificación técnica.

---

# Lint

Ejecutar:

```bash
npm run lint
```

Corregir automáticamente los problemas compatibles:

```bash
npm run lint:fix
```

Los errores de lint deben solucionarse antes de producción.

---

# Unit Tests

Las pruebas unitarias utilizan Vitest.

Ejecutar:

```bash
npm run test
```

Modo interactivo:

```bash
npm run test:watch
```

Coverage:

```bash
npm run test:coverage
```

Configuración:

```text
vitest.config.ts
```

Pruebas:

```text
tests/unit/
```

---

# End-to-End Tests

Las pruebas E2E utilizan Playwright.

Ejecutar:

```bash
npm run test:e2e
```

Interfaz:

```bash
npm run test:e2e:ui
```

Modo headed:

```bash
npm run test:e2e:headed
```

Configuración:

```text
playwright.config.ts
```

Pruebas:

```text
tests/e2e/
```

---

# Quality Gate

Antes de considerar una versión preparada para producción:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run security:audit
```

También puede ejecutarse:

```bash
npm run check
```

para:

```text
lint
typecheck
unit tests
```

Y:

```bash
npm run check:all
```

para ejecutar el conjunto completo definido por el proyecto.

---

# Production Build

Construir la aplicación:

```bash
npm run build
```

Si el build termina correctamente:

```bash
npm start
```

El build de producción debe completarse sin errores de:

* TypeScript;
* ESLint;
* imports;
* exports;
* módulos;
* Server Components;
* Client Components;
* configuración;
* rutas.

---

# Security Audit

Ejecutar:

```bash
npm run security:audit
```

que utiliza:

```bash
npm audit --audit-level=high
```

Las vulnerabilidades relevantes deben evaluarse antes de desplegar.

---

# Security

La política completa de seguridad está disponible en:

```text
SECURITY.md
```

Principios fundamentales:

* Nunca publicar secretos.
* Nunca utilizar `NEXT_PUBLIC_` para secretos.
* Utilizar RLS para datos protegidos.
* Validar operaciones sensibles server-side.
* Proteger rutas administrativas.
* Verificar webhooks.
* Utilizar idempotencia en operaciones críticas.
* No confiar en valores enviados por el cliente.
* Mantener dependencias actualizadas.
* Ejecutar las comprobaciones de seguridad antes de producción.

---

# Payments

Las confirmaciones de pago no deben depender únicamente del cliente.

El flujo esperado es:

```text
Cliente
   ↓
Servidor
   ↓
Proveedor de pago
   ↓
Webhook
   ↓
Verificación
   ↓
Idempotencia
   ↓
Actualización de orden
```

Los webhooks deben validarse antes de modificar estados financieros o comerciales.

---

# Orders and Checkout

Las órdenes deben validarse en el servidor.

El servidor debe volver a comprobar, cuando corresponda:

* usuario;
* productos;
* cantidades;
* disponibilidad;
* precio;
* moneda;
* descuentos;
* estado;
* autorización.

No se debe confiar ciegamente en los valores enviados desde el navegador.

---

# API

Las APIs se encuentran bajo:

```text
src/app/api/
```

Los endpoints deben implementar, según corresponda:

* autenticación;
* autorización;
* validación;
* manejo seguro de errores;
* idempotencia;
* límites apropiados;
* auditoría.

Las entradas externas deben considerarse no confiables.

---

# Server and Client Boundaries

El proyecto diferencia claramente código server-side y client-side.

Los secretos y operaciones privilegiadas deben permanecer en el servidor.

No deben importarse módulos administrativos o secretos en Client Components.

Evitar exponer:

```text
SUPABASE_SECRET_KEY
DATABASE_URL
GEMINI_API_KEY
```

al navegador.

---

# Images and Storage

Las imágenes remotas permitidas deben declararse explícitamente en:

```text
next.config.ts
```

El almacenamiento de archivos debe realizarse mediante mecanismos apropiados.

No se deben utilizar secretos en URLs públicas.

Los archivos subidos por usuarios deben considerarse contenido no confiable.

---

# Vercel

Credi Marketplace está preparado para desplegarse en Vercel.

El repositorio debe tener:

```text
package.json
```

en su raíz.

No se debe establecer un `Root Directory` anidado si el proyecto completo ya se encuentra en la raíz del repositorio.

---

# Vercel Environment Variables

Las variables de producción deben configurarse en Vercel.

No deben copiarse secretos directamente al repositorio.

Las variables deben configurarse según el entorno:

```text
Development
Preview
Production
```

Después de modificar variables de entorno en Vercel puede ser necesario realizar un nuevo deployment.

---

# Deployment Flow

Flujo recomendado:

```text
Local development
       ↓
npm run lint
       ↓
npm run typecheck
       ↓
npm run test
       ↓
npm run test:e2e
       ↓
npm run security:audit
       ↓
npm run build
       ↓
Git push
       ↓
CI
       ↓
Vercel
       ↓
Production
```

---

# CI/CD

El pipeline debe impedir despliegues cuando fallen las comprobaciones críticas.

Como mínimo:

```text
ESLint
TypeScript
Unit Tests
E2E Tests
Security Audit
Production Build
```

Las credenciales utilizadas por CI/CD deben almacenarse como secretos del proveedor.

Nunca deben escribirse directamente en archivos de configuración versionados.

---

# Git Workflow

Antes de realizar un commit:

```bash
npm run lint
npm run typecheck
npm run test
```

Antes de producción:

```bash
npm run check:all
```

Revisar siempre:

```bash
git status
git diff
```

antes de publicar cambios.

---

# Secret Protection

Nunca realizar commit de:

```text
.env
.env.local
.env.production
.env.development.local
.env.test
```

El repositorio puede contener:

```text
.env.example
```

siempre que no incluya secretos reales.

Si una clave secreta es expuesta accidentalmente:

1. Rotar la credencial.
2. Revocar la anterior.
3. Revisar dónde fue expuesta.
4. Actualizar los entornos afectados.
5. Revisar los logs cuando corresponda.
6. Verificar que la credencial anterior ya no sea válida.

Eliminar una clave de un commit posterior no significa que la clave anterior haya dejado de estar comprometida.

---

# Database Migrations

Las migraciones se almacenan en:

```text
supabase/migrations/
```

Las pruebas de integración:

```text
supabase/tests/integration/
```

Las migraciones deben ser:

* versionadas;
* reproducibles;
* revisadas;
* compatibles con RLS;
* seguras para los datos existentes.

---

# Recommended Development Workflow

Para comenzar una nueva sesión de desarrollo:

```bash
nvm use
npm ci
npm run lint
npm run typecheck
npm run test
```

Durante el desarrollo:

```bash
npm run dev
```

Antes de realizar push:

```bash
npm run check
```

Antes de producción:

```bash
npm run check:all
npm run security:audit
```

---

# Troubleshooting

## Build falla por un export

Si aparece:

```text
Export X doesn't exist in target module
```

revisar que el tipo de export coincida con el import.

Named export:

```tsx
export function AdminDashboard() {}
```

requiere:

```tsx
import { AdminDashboard } from "@/components/admin/AdminDashboard";
```

Default export:

```tsx
export default function AdminDashboard() {}
```

requiere:

```tsx
import AdminDashboard from "@/components/admin/AdminDashboard";
```

No mezclar ambas formas sin necesidad.

---

## Build falla con Tailwind

Credi Marketplace utiliza Tailwind CSS 4.

La integración PostCSS utiliza:

```text
@tailwindcss/postcss
```

Configuración:

```text
postcss.config.mjs
```

No utilizar configuración de Tailwind CSS 3 incompatible con Tailwind CSS 4.

---

## Build falla con Turbopack

Primero comprobar:

```bash
npm run typecheck
npm run lint
```

Después:

```bash
npm run build
```

Los errores de parsing TSX, imports o exports deben corregirse en el código fuente.

No solucionar errores estructurales desactivando comprobaciones de TypeScript.

---

# Technology Decisions

Credi Marketplace evita introducir complejidad arquitectónica innecesaria durante las primeras etapas.

No se adopta automáticamente:

* microservicios;
* Kubernetes;
* Elasticsearch;
* Redux global;
* infraestructura distribuida innecesaria.

La arquitectura debe evolucionar conforme existan necesidades reales de escala, rendimiento u operación.

---

# Performance

Las optimizaciones deben realizarse sobre necesidades reales.

Principios:

* Server Components cuando sean apropiados;
* Client Components únicamente cuando sean necesarios;
* imágenes optimizadas;
* consultas eficientes;
* índices de base de datos apropiados;
* paginación;
* caché cuando corresponda;
* evitar JavaScript innecesario en el cliente.

No se debe introducir infraestructura adicional únicamente por anticipación.

---

# Accessibility

La interfaz debe procurar:

* HTML semántico;
* navegación mediante teclado;
* estados de foco visibles;
* etiquetas apropiadas;
* contraste adecuado;
* atributos ARIA únicamente cuando sean necesarios;
* mensajes comprensibles.

---

# Internationalization

La aplicación contempla múltiples idiomas.

Configuración inicial:

```text
es
en
pt
fr
```

El idioma predeterminado es:

```text
es
```

La configuración debe mantenerse centralizada.

---

# Default Region

La configuración inicial contempla Venezuela:

```text
Country: VE
Currency: VES
Locale: es
```

Los valores deben poder evolucionar a medida que se incorporen nuevos mercados.

---

# Documentation

La documentación adicional se encuentra en:

```text
docs/
```

Las decisiones arquitectónicas importantes deben documentarse para mantener continuidad técnica.

---

# License

Este proyecto es privado y su código no se distribuye bajo una licencia open source por defecto.

Consulta:

```text
package.json
```

para la declaración de licencia del proyecto.

---

# Status

Credi Marketplace se encuentra en desarrollo activo.

Los módulos pueden evolucionar conforme se completen:

* autenticación;
* marketplace;
* vendedores;
* B2B;
* afiliados;
* pagos;
* administración;
* pruebas;
* seguridad;
* despliegue.

---

# Final Production Checklist

Antes de producción:

```text
[ ] Node.js correcto
[ ] npm correcto
[ ] package-lock.json actualizado
[ ] npm ci funciona
[ ] ESLint pasa
[ ] TypeScript pasa
[ ] Unit tests pasan
[ ] E2E tests pasan
[ ] Security audit revisado
[ ] Production build pasa
[ ] Variables Vercel configuradas
[ ] Secretos fuera de Git
[ ] RLS habilitado
[ ] Rutas administrativas protegidas
[ ] APIs protegidas
[ ] Webhooks verificados
[ ] Operaciones críticas idempotentes
[ ] Migraciones revisadas
[ ] Configuración de producción verificada
```

---

# Quick Commands

### Desarrollo

```bash
npm run dev
```

### Turbopack

```bash
npm run dev:turbo
```

### Lint

```bash
npm run lint
```

### TypeScript

```bash
npm run typecheck
```

### Tests

```bash
npm run test
```

### E2E

```bash
npm run test:e2e
```

### Build

```bash
npm run build
```

### Security

```bash
npm run security:audit
```

### Validación general

```bash
npm run check
```

### Validación completa

```bash
npm run check:all
```

---

# Credi Marketplace

**Marketplace · E-commerce · Afiliados · B2B · Servicios · Pagos · Administración**

Construido con:

```text
Next.js 16
React 19
TypeScript
Tailwind CSS 4
Supabase
Vercel
Vitest
Playwright
```
