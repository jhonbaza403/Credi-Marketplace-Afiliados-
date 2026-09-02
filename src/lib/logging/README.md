# Logging

Helpers y adaptadores de logging estructurado para Credi Marketplace.

## Propósito

Este directorio contiene utilidades relacionadas con el registro de eventos de la aplicación.

El logging debe ser:

* estructurado;
* consistente;
* seguro para producción;
* útil para diagnóstico y observabilidad;
* libre de secretos, tokens, contraseñas y datos sensibles innecesarios.

## Logger principal

Cuando exista una necesidad de registrar eventos desde código de la aplicación, debe reutilizarse el logger centralizado disponible en este módulo o el logger de observabilidad del proyecto, evitando crear implementaciones duplicadas.

Ejemplo:

```ts
import { logger } from "@/lib/logging";

logger.info("Operación completada", {
  requestId,
  action: "example",
});
```

## Niveles

Los niveles soportados son:

* `info`: eventos informativos;
* `warn`: situaciones anómalas o pendientes que no detienen la operación;
* `error`: errores que requieren atención o diagnóstico.

## Seguridad

Nunca registrar:

* contraseñas;
* tokens de acceso;
* claves API;
* secretos de Supabase;
* cookies de sesión;
* credenciales de pago;
* información sensible innecesaria.

En webhooks de pagos y operaciones financieras, registrar únicamente la información necesaria para trazabilidad y diagnóstico.

## Arquitectura

El logging es una preocupación transversal de la aplicación.

Los módulos de dominio no deben implementar sus propios sistemas de logging cuando puedan reutilizar el logger centralizado.

La observabilidad avanzada, integración con proveedores externos y envío de logs a sistemas externos debe mantenerse desacoplada de los componentes de negocio.

## Relación con observabilidad

El módulo:

```text
src/lib/logging/
```

proporciona las utilidades de logging de aplicación.

El módulo:

```text
src/lib/observability/
```

contiene las capacidades relacionadas con observabilidad y diagnóstico.

Ambos deben mantener un formato de eventos consistente y evitar implementaciones redundantes.
