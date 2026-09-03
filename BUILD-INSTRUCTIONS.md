# Credi Marketplace — verificación local y Vercel

## Requisitos

- Node.js 22.x LTS.
- npm 10.x.
- Acceso a las variables de entorno necesarias para Supabase y servicios externos.

La versión de Node debe coincidir con `.nvmrc` y con `engines` de `package.json`.

## Instalación limpia

```bash
rm -rf node_modules .next
npm ci
```

En Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules,.next -ErrorAction SilentlyContinue
npm ci
```

## Variables de entorno

Copia `.env.example` a `.env.local` y completa únicamente los valores necesarios.
Nunca commits secretos reales al repositorio.

```bash
cp .env.example .env.local
```

## Verificaciones

```bash
npm run verify:structure
npm run typecheck
npm run lint
npm run test
npm run security:audit
npm run build
```

Para una validación completa, incluyendo E2E:

```bash
npm run check:all
```

## Desarrollo

```bash
npm run dev:turbo
```

La configuración de Playwright reutiliza `PLAYWRIGHT_BASE_URL` y arranca el servidor mediante `next dev --turbo`.

## Vercel

El despliegue está alineado con Node.js 22.x, `npm` 10.x y `package-lock.json`.

No subas `.env.local`, credenciales, claves privadas ni archivos generados de desarrollo.

Vercel debe trabajar con el lockfile comprometido en el repositorio para mantener instalaciones reproducibles.
