# Credi Marketplace — documentación canónica

Esta carpeta es la fuente documental única del proyecto. La documentación de arquitectura y operación debe vivir aquí y mantenerse sincronizada con el código ejecutable.

## Estructura

```text
docs/
├── README.md
├── FOUR-PILLARS-ARCHITECTURE.md
├── architecture.md
├── api.md
├── database.md
├── security.md
├── compliance.md
├── deployment.md
├── social-publishing.md
└── supabase-migrations-audit.md
```

Los archivos `.svg` del directorio `docs/` son recursos documentales asociados a esos documentos y no forman parte de los assets públicos de la aplicación.

## Arquitectura de producto

- **Cuatro pilares:** consulta [FOUR-PILLARS-ARCHITECTURE.md](./FOUR-PILLARS-ARCHITECTURE.md) para la taxonomía funcional, el estado real de implementación, los contratos compartidos y la hoja de ruta.
- El registro de navegación de producto está en `src/config/portal.ts`; clasifica rutas por pilar, pero no concede permisos.
- Los cuatro pilares son dominios de producto dentro de una sola plataforma, no cuatro aplicaciones ni bases de datos separadas.

## Fuente de verdad

- Aplicación: `src/app/`
- Componentes compartidos: `src/components/`
- Features de dominio: `src/features/`
- Estado transversal: `src/context/`
- Infraestructura: `src/lib/`
- Servicios: `src/services/`
- Contratos: `src/types/` y `src/schemas/`
- Assets web: `public/`
- Supabase: `supabase/`

La implementación, migraciones, CI/CD y configuración real tienen prioridad sobre cualquier afirmación documental.

## Verificación

Antes de declarar el proyecto listo:

```bash
npm ci
npm run verify:structure
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run security:audit
npm run build
```
