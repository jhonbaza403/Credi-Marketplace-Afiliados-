# Credi Marketplace — verificación local y Vercel

## Requisitos

- Node.js 24.20.0 o superior.
- npm 10+.
- Acceso a las variables de entorno necesarias para Supabase y servicios externos.

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

## Verificaciones

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Para una validación completa:

```bash
npm run check:all
```

## Vercel

El proyecto está preparado para Node.js 24.x mediante `.nvmrc` y `engines.node`.
No subas archivos `.env.local` ni otros secretos al repositorio.

Vercel debe instalar dependencias con el lockfile (`npm ci` es reproducible).
