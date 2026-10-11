# Auditoría de completitud de rutas — cambios de configuración

Fecha: 2026-10-11  
Rama: `feat/route-completeness-patch-final`

## Cambios incluidos en esta rama

### 1. Política de seguridad de contenido y multimedia

- Se mantienen los encabezados de seguridad existentes y `typescript.ignoreBuildErrors: false`.
- Se agregan orígenes concretos para imágenes y multimedia de Cloudflare Stream, S3/Amazon, CloudFront, Vimeo y miniaturas de YouTube.
- Se alinean los `remotePatterns` de `next/image` con los proveedores añadidos a CSP.
- Se conserva `frame-src` para los reproductores de YouTube/Vimeo y Cloudflare Stream.
- No se incluye la directiva `video-src`: no es una directiva estándar de CSP; la política de medios de vídeo se controla con `media-src`.

Los dominios permitidos deben ajustarse a los proveedores efectivamente utilizados por el producto. Añadir un origen a CSP no prueba por sí solo que el recurso funcione: hace falta validación en Preview con multimedia real.

### 2. Redirecciones canónicas

- `/inicio` → `/`
- `/muro` → `/social`
- `/seller` → `/seller/dashboard`
- `/seller/b2b` y subrutas → `/b2b` y subrutas
- `/jobs`, `/explorar`, `/servicios` y `/productos` → `/marketplace` y las subrutas correspondientes
- `/ads` y `/publicidad` → `/marketing`

Estas redirecciones deben confirmarse con pruebas HTTP/E2E, incluida la existencia de los destinos y el comportamiento de subrutas.

### 3. Páginas que ya están presentes en la rama base

La rama base ya contiene páginas para los módulos de Apps, Business OS, Automatización, Abastecimiento, Compras Mayoristas, Ecosistema Avanzado, Gestión Empresarial, Mercados Conectados, Negociaciones, Proveedores Verificados, Red Comercial, Historias, Commerce Studio, Product Graph, Inventario, Catálogo Video e Intelligence, además de páginas de Privacidad, Términos, Cookies, Contacto y Derechos del Consumidor.

Por tanto, esta PR no afirma haber creado esas páginas nuevas: las conserva y documenta. La existencia de una página no acredita que el módulo de negocio esté funcional.

### 4. Contacto y cumplimiento

La página de contacto existente enlaza a Credi Chat y Seguridad; no se ha reemplazado por un formulario que muestre un envío ficticio. Para aceptar mensajes de forma real hace falta conectar un endpoint de backend con validación, protección antiabuso, persistencia/entrega y tratamiento seguro de datos.

Las páginas legales son contenido inicial y requieren revisión jurídica por las jurisdicciones en las que opere Credi Marketplace. Su presencia no equivale a certificación de cumplimiento.

## Validación pendiente

Ejecutar en CI/Preview:

```bash
npm run verify:structure
npm run audit:routes
npm run audit:route-completeness
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Además, probar redirecciones y carga real de imágenes, vídeo y embeds en el navegador. No se ha realizado despliegue de producción ni se declara esta rama lista para merge hasta revisar los checks.
