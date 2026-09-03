# Audit & Repair Notes — Credi Marketplace

## Correcciones consolidadas

1. **Runtime**: Node.js 22.x LTS y npm 10.x alineados en `.nvmrc`, `package.json`, CI/CD y documentación.
2. **Framework**: Next.js 16.3.4 con App Router y React 19.
3. **TypeScript**: proyecto configurado como TypeScript-only mediante `allowJs: false`.
4. **ESLint**: configuración Flat Config compatible con ESLint 9, sin `FlatCompat`.
5. **Tailwind CSS**: Tailwind CSS 4 con `@tailwindcss/postcss`.
6. **Entorno**: `.env.example` convertido en la plantilla canónica y alineado con `src/env.ts`; se eliminó el duplicado `env.example`.
7. **Playwright**: usa `PLAYWRIGHT_BASE_URL` y arranca el desarrollo mediante `next dev --turbo`.
8. **Vitest**: resolución del alias `@` y `setupFiles` basada en rutas ESM seguras.
9. **Verificación estructural**: `scripts-verify.mjs` valida archivos críticos, directorios, Node.js, `.nvmrc`, engines, versiones base y coherencia básica del lockfile.
10. **Seguridad de repositorio**: `.gitignore` reforzado para variables de entorno, artefactos, certificados y material privado.
11. **Vercel**: `.vercelignore` reducido a material que no forma parte del build de producción.

## Criterio de verificación

Una inspección estática no equivale a un build de producción exitoso. La confirmación definitiva requiere ejecutar:

```bash
npm run build
```

No se debe marcar producción como verificada mientras ese comando no termine correctamente en un entorno con las dependencias instaladas.
