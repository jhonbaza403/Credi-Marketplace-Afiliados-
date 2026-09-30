# Credi Portal — arquitectura de experiencia unificada

**Estado:** ACTIVE  
**Principio:** una sola experiencia de portal; múltiples capacidades, no múltiples portales.

## Portal canónico

La raíz `/` es la entrada principal de Credi Marketplace. La navegación primaria es: Inicio, Muro, Marketplace, Servicios y Free. Publicar y Chat permanecen como acciones persistentes. Las capacidades adicionales viven en **Más** y no crean otra navegación.

## Credi Free

`/free` es el hub de acceso gratuito al mismo ecosistema. **Free no es un plan comercial** y no representa al creador/administrador.

Desde Free se accede al mismo Muro, Marketplace, Servicios y Chat. Los planes comerciales permanecen en `/pricing` como ampliaciones opcionales.

## Muro

`/social` es el destino canónico de la experiencia social: historias, publicaciones, reels, oportunidades comerciales y acciones rápidas, conectado con Marketplace, Servicios y Chat.

La experiencia usa patrones de portal social contemporáneo —feed, historias, navegación lateral, acciones contextuales y adaptación móvil— pero mantiene identidad visual y funcional propia de Credi.

## No duplicación

Una capacidad debe tener una implementación principal. Se permiten aliases históricos para compatibilidad, pero deben redirigir a una ruta canónica y no contener lógica de negocio paralela.

## Separación de responsabilidades

- **Portal:** navegación, descubrimiento y composición.
- **Muro:** contenido social.
- **Marketplace:** catálogo y comercio.
- **Servicios:** contratación de servicios.
- **Chat:** comunicación.
- **Free:** acceso gratuito al mismo producto.
- **Pricing:** únicamente capacidades comerciales y facturación.

Ninguna superficie debe crear otra identidad, otro header principal o una segunda fuente de verdad.

## Regla visual

Los fondos decorativos nunca pueden ocultar títulos, subtítulos, labels, campos, selectores, botones, errores o estados de carga. Los formularios reciben superficies funcionales legibles; el fondo premium queda detrás.

> **Más capacidades dentro del mismo portal; no más portales para las mismas capacidades.**
