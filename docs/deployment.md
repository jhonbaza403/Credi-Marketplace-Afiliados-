# Credi Marketplace — Guía de Despliegue

> Runbook oficial de despliegue. La plataforma objetivo es **Vercel** y el backend es **Supabase**.

## 1. Stack de producción

| Componente | Estándar |
|---|---|
| Framework | Next.js 16.3.x + App Router |
| UI | React 19.x |
| Runtime | Node.js 22.x |
| npm | 10.x |
| CSS | Tailwind CSS 4 |
| Backend | Supabase |
| Database | PostgreSQL |
| Auth | Supabase Auth / SSR |
| Deploy | Vercel |

El proyecto declara Node 22.x y npm 10.x en `package.json`, y `.nvmrc` contiene `22`.

## 2. Pipeline obligatorio

Ningún despliegue de producción debe saltarse la línea de validación:

```text
Git push / Pull Request
        ↓
Credi Marketplace CI
        ↓
Security Audit
        ↓
Deployment Gate
        ↓
Vercel
```

El CI valida estructura, dependencias, ESLint, TypeScript, pruebas unitarias, E2E y build. Security valida vulnerabilidades de dependencias. El Deployment Gate solo autoriza un CI exitoso de `main`.

## 3. Instalación reproducible

Usar el lockfile como fuente de resolución:

```bash
npm ci
```

No reemplazar `npm ci` por `npm install` en CI.

## 4. Validación local previa

Antes de publicar:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm audit --audit-level=high
```

El comando oficial de validación completa definido por el proyecto es `npm run check:all` cuando las variables y servicios requeridos están disponibles.

## 5. Vercel

Conectar el repositorio de GitHub con el proyecto de Vercel y mantener producción vinculada a `main`.

La configuración de Vercel debe respetar:

```text
Node.js 22.x
npm 10.x
Next.js App Router
```

No utilizar OpenNext para un despliegue Vercel de este proyecto.

## 6. Variables de entorno

Separar estrictamente variables públicas de secretos.

### Públicas

```env
NEXT_PUBLIC_APP_URL=https://tu-dominio.example
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Solo servidor

```env
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
PAYMENT_PROVIDER_SECRET=...
PAYMENT_WEBHOOK_SECRET=...
```

Los secretos nunca deben tener prefijo `NEXT_PUBLIC_`, almacenarse en Git o aparecer en logs.

## 7. Supabase

Supabase permanece como backend/base de datos. Antes de una liberación revisar:

```text
migrations
RLS
RPC
índices
triggers
constraints
webhooks
```

Las migraciones deben estar versionadas en Git. Los cambios de esquema hechos manualmente en producción deben evitarse.

## 8. Preview vs Production

Mantener separados los entornos.

```text
Preview
  ├── datos de prueba
  └── secretos de preview

Production
  ├── datos reales
  └── secretos de producción
```

No copiar secretos de producción a previews sin una necesidad explícita y controlada.

## 9. Build de producción

El build oficial es:

```bash
npm run build
```

Un build exitoso no reemplaza las pruebas ni la auditoría de seguridad.

## 10. Caché y datos privados

Los assets estáticos pueden aprovechar el CDN. Las rutas transaccionales y privadas deben evitar caché público accidental:

```text
/api/auth/*
/api/orders/*
/api/checkout/*
/api/payments/*
/api/ai/*
```

## 11. Dominio y HTTPS

Producción debe usar HTTPS y un dominio canónico definido. No almacenar URLs de producción como secretos.

Ejemplo:

```env
NEXT_PUBLIC_APP_URL=https://tu-dominio.example
```

## 12. Webhooks

Los webhooks de proveedores externos deben apuntar al endpoint público correcto de producción y validar autenticidad antes de modificar órdenes o pagos.

Un webhook recibido no implica confianza automática en su contenido.

## 13. Rollback

Ante una regresión:

```text
detectar
  ↓
bloquear nueva promoción
  ↓
identificar commit/deployment
  ↓
rollback en Vercel
  ↓
verificar salud
  ↓
registrar incidente
```

El rollback debe identificar claramente el commit desplegado.

## 14. Checklist de liberación

```text
[ ] CI verde
[ ] Security verde
[ ] Deployment Gate aprobado
[ ] Variables correctas
[ ] Supabase/migraciones verificadas
[ ] RLS verificado
[ ] Webhooks verificados
[ ] Build exitoso
[ ] Smoke test posterior al deploy
```

## 15. Smoke test posterior

Comprobar al menos:

```text
Inicio
Registro/Login
Catálogo
Producto
Carrito
Checkout
Orden
Autenticación
API principal
Webhook cuando aplique
```

## 16. No hacer

No introducir en el pipeline de despliegue:

```text
Cloudflare como plataforma principal
OpenNext
Node 24
Pages Router
credenciales en el repositorio
secretos NEXT_PUBLIC_*
```

La plataforma oficial documentada es **Vercel + Supabase + Node.js 22.x**.

## 17. Diagrama

![Flujo de despliegue](deployment.svg)

## 18. Principio final

**Solo se despliega el código que haya superado CI, Security y el Deployment Gate sobre el commit validado.**
