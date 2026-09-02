# Credi Marketplace — reparación aplicada

## Correcciones realizadas

- Next.js fijado a `16.3.3`.
- React/React DOM alineados con React 19.
- Tailwind CSS fijado a `4.3.3`.
- Añadido `@tailwindcss/postcss` `4.3.3` para la configuración PostCSS de Tailwind v4.
- Añadido `engines.node: ">=24.20.0"`.
- Script `lint` migrado de `next lint` a `eslint .` porque Next.js 16 eliminó `next lint`.
- `build` usa Turbopack explícitamente.
- `tsconfig.json`: alias `@/*` corregido de `./*` a `./src/*`.
- `tsconfig.json`: `allowJs` desactivado; no existen `.js/.jsx` bajo `src`.
- Eliminadas cercas Markdown accidentales (` ``` `) que estaban embebidas en archivos fuente/configuración.
- Creado `BUILD-INSTRUCTIONS.md` con instalación limpia y verificación.
- Eliminado `.env.local` del paquete reparado para evitar distribuir variables sensibles.

## Verificaciones realizadas

- No hay directorio `pages/`; la aplicación usa App Router.
- No hay `.js/.jsx` dentro de `src/`.
- No quedan cercas Markdown en archivos de código/configuración.
- Los imports internos analizados resuelven correctamente con el alias `@/* -> src/*`.
- `.gitignore` y `.vercelignore` ya excluyen archivos `.env*` y permiten conservar `package-lock.json`.

## Pendiente fuera de este entorno

No se pudo generar un `package-lock.json` porque el entorno no consiguió completar el acceso al registro npm y tampoco tenía los metadatos en caché. No se incluye un lockfile inventado.

En una máquina con acceso normal a npm, desde la raíz:

```bash
rm -rf node_modules .next
npm install
npm run typecheck
npm run lint
npm run test
npm run build
```

Después de validar, `package-lock.json` debe guardarse y versionarse junto con `package.json`.
