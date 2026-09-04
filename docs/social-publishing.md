# Publicación multiplataforma — Credi Marketplace

Credi Marketplace permite preparar una publicación de un producto, bien, servicio u oferta y distribuirla a canales sociales compatibles.

## Principio de seguridad

La plataforma no debe almacenar tokens OAuth en texto plano ni exponer secretos en el navegador. Las credenciales de proveedores son exclusivamente server-side y deben estar cifradas o referenciadas mediante un mecanismo seguro de secretos.

## Canales previstos

- TikTok
- TikTok Shop
- YouTube
- Instagram
- Facebook
- Threads
- Pinterest
- LinkedIn

La matriz de capacidades está en `src/config/social-publishing.config.ts`.

## Flujo

1. El usuario crea una publicación en Credi Marketplace.
2. Credi genera una representación compatible del contenido.
3. El usuario conecta una cuenta social mediante OAuth.
4. Se crea una entrada en `social_publications` con estado `queued`.
5. Un proceso server-side publica o entrega el contenido al proveedor.
6. Se guarda únicamente el identificador/URL pública del resultado y el estado.
7. Los errores quedan registrados sin incluir tokens ni secretos.

## Importante sobre las APIs externas

No se debe asumir que todas las redes permiten publicación automática con las mismas condiciones. Cada proveedor puede exigir aplicación registrada, scopes específicos, OAuth, revisión, auditoría, límites de uso y requisitos de contenido.

TikTok, por ejemplo, ofrece Content Posting API para publicación directa y carga de borradores, pero requiere una aplicación registrada, scopes autorizados y consentimiento de la cuenta; los clientes no auditados tienen restricciones de visibilidad. TikTok Shop utiliza un modelo separado de Partner Center/API y OAuth para sellers, creators y partners.

Por ello, la aplicación debe usar adaptadores por proveedor y una cola común, en lugar de acoplar la publicación a una sola red.

## TikTok Shop

TikTok Shop no debe tratarse simplemente como otra red social. Su integración puede involucrar catálogo, productos, pedidos, fulfillment, finanzas, afiliación y webhooks. El acceso depende de la aplicación, scopes y autorización del seller/creator/partner correspondiente.

## Contenido

Una misma publicación puede tener:

- título
- descripción/caption
- imágenes
- video
- precio
- enlace al listing
- hashtags
- llamada a la acción
- variantes por plataforma

El adaptador de cada proveedor decide qué campos son compatibles. No se debe forzar el mismo payload a todas las plataformas.

## Arquitectura

```text
Listing / Offer
      |
      v
Content Composer
      |
      v
Social Publication Queue
      |
      +--> TikTok adapter
      +--> TikTok Shop adapter
      +--> YouTube adapter
      +--> Instagram adapter
      +--> Facebook adapter
      +--> Threads adapter
      +--> Pinterest adapter
      +--> LinkedIn adapter
```

Las publicaciones fallidas deben poder reintentarse de forma idempotente, con backoff y límites de intentos.
