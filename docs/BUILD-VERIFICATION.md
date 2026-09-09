# Credi Marketplace — Build Verification

## Estado

Este documento registra los criterios de verificación para la configuración y el árbol fuente del proyecto.

> Una comprobación estática o de estructura no constituye una prueba de build de producción. El build real debe completarse con `npm run build`.

## Runtime objetivo

| Componente | Objetivo |
|---|---|
| Node.js | 24.x LTS |
| npm | 11.x |
| Next.js | 16.3.4 |
| React | 19.0.0 |
| TypeScript | 5.6.x |
| Tailwind CSS | 4.x |
| Backend/Auth | Supabase |
| Deployment | Vercel |

La configuración debe permanecer coherente con `.nvmrc`, `package.json` y `package-lock.json`.

## Verificación estructural

```bash
npm run verify:structure
```

## Calidad estática

```bash
npm run lint
npm run typecheck
```

## Tests

```bash
npm run test
npm run test:e2e
```

## Supabase

Las credenciales privilegiadas deben permanecer server-only. Las operaciones protegidas deben conservar autorización server-side y RLS en Supabase.

## Build de producción

```bash
npm run build
```

## Secuencia recomendada

```text
npm ci
   ↓
npm run verify:structure
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
```

## Estado de producción

Actualizar este estado únicamente con evidencia real de GitHub Actions y Vercel para el commit evaluado.
