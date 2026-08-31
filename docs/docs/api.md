# Documentación de API — Credi Marketplace

## 1. Propósito

La API de **Credi Marketplace** está diseñada como una capa de servicios segura y desacoplada para operaciones de autenticación, catálogo, comercio electrónico, órdenes, checkout, mercado B2B y asistencia mediante inteligencia artificial.

La arquitectura utiliza **Next.js App Router**, Route Handlers, **Supabase Auth**, PostgreSQL y operaciones transaccionales mediante funciones RPC cuando una operación requiere consistencia de inventario o integridad financiera.

### Principios fundamentales

* El navegador nunca constituye la fuente de verdad para precios, stock, comisiones o estados de pago.
* La identidad del usuario debe verificarse mediante Supabase Auth en el servidor.
* Las operaciones financieras deben ejecutarse del lado servidor.
* El inventario debe modificarse mediante operaciones atómicas.
* Las órdenes se crean inicialmente en estado `pending`.
* El cliente nunca puede marcar una orden como pagada.
* Las claves privadas y secretos nunca deben exponerse mediante `NEXT_PUBLIC_*`.
* Las respuestas de error no deben revelar información interna de PostgreSQL, Supabase o infraestructura.
* Las operaciones sensibles deben disponer de trazabilidad mediante `requestId`.
* Los endpoints dinámicos deben utilizar `Cache-Control: no-store` cuando trabajen con información privada o transaccional.

---

# 2. Arquitectura de acceso

La API se divide conceptualmente en cinco niveles:

```text
Cliente / Browser
       │
       ▼
Next.js App Router
       │
       ├── Route Handlers
       │
       ├── Server Components
       │
       └── Server Actions
       │
       ▼
Capa de autenticación
Supabase Auth
       │
       ▼
Capa de dominio
Orders / Products / B2B / AI
       │
       ▼
PostgreSQL / Supabase
       │
       └── RPC transaccional
```

Las operaciones de lectura pública pueden utilizar consultas controladas sobre Supabase, mientras que las operaciones que modifican estado deben incorporar validación de identidad, autorización, validación de entrada y controles de concurrencia.

---

# 3. Convenciones HTTP

## Métodos

| Método   | Uso                                             |
| -------- | ----------------------------------------------- |
| `GET`    | Lectura de recursos                             |
| `POST`   | Creación de recursos o ejecución de operaciones |
| `PATCH`  | Actualización parcial                           |
| `PUT`    | Reemplazo completo cuando corresponda           |
| `DELETE` | Eliminación lógica o física según el dominio    |

## Content-Type

Las operaciones JSON deben utilizar:

```http
Content-Type: application/json
```

Las APIs que reciban otro formato deberán documentarlo expresamente.

---

# 4. Formato estándar de respuesta

## Respuesta exitosa

```json
{
  "success": true,
  "data": {}
}
```

Cuando corresponda, podrán agregarse metadatos:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

## Respuesta de error

Las APIs deberán mantener una estructura consistente:

```json
{
  "success": false,
  "error": "Descripción pública del error.",
  "code": "ERROR_CODE"
}
```

Los códigos permiten que el frontend maneje errores de manera determinista sin depender del texto humano del mensaje.

---

# 5. Códigos HTTP

| Código | Significado                               |
| -----: | ----------------------------------------- |
|  `200` | Operación exitosa                         |
|  `201` | Recurso creado                            |
|  `204` | Operación exitosa sin contenido           |
|  `400` | Solicitud inválida                        |
|  `401` | Usuario no autenticado                    |
|  `403` | Usuario autenticado pero sin autorización |
|  `404` | Recurso inexistente                       |
|  `409` | Conflicto de estado, stock o concurrencia |
|  `415` | Content-Type no soportado                 |
|  `422` | Datos semánticamente inválidos            |
|  `429` | Demasiadas solicitudes                    |
|  `500` | Error interno                             |
|  `503` | Servicio temporalmente no disponible      |

---

# 6. Autenticación

La autenticación principal es gestionada por **Supabase Auth**.

## Registro

```http
POST /auth/v1/signup
```

Este endpoint pertenece a Supabase Auth y no debe duplicarse innecesariamente dentro de Route Handlers propios.

El frontend puede utilizar el cliente Supabase correspondiente para registrar al usuario.

Los datos complementarios del usuario deben almacenarse en `profiles` mediante una operación segura y controlada.

### Datos conceptuales

```json
{
  "email": "usuario@example.com",
  "password": "********",
  "options": {
    "data": {
      "full_name": "Nombre del usuario",
      "role": "customer"
    }
  }
}
```

> El rol enviado por el navegador no debe considerarse una autorización definitiva. Los privilegios reales deben determinarse en servidor mediante políticas de acceso y datos persistidos.

---

# 7. Inicio de sesión

```http
POST /auth/v1/token
```

Gestionado por Supabase Auth.

El sistema debe utilizar sesiones seguras y evitar almacenar tokens sensibles en `localStorage` cuando la arquitectura de autenticación utilice cookies administradas por Supabase.

---

# 8. Marketplace

## Catálogo

```http
GET /marketplace
```

Carga los productos disponibles para el usuario.

Los productos públicos deberían cumplir como mínimo:

```text
is_active = true
stock > 0
```

La consulta pública nunca debe exponer:

* credenciales;
* información financiera privada del vendedor;
* datos internos de administración;
* tokens;
* direcciones privadas;
* información sensible de otros usuarios.

---

# 9. Producto individual

```http
GET /marketplace/products/[slug]
```

Obtiene la información pública de un producto mediante su `slug`.

### Ejemplo

```http
GET /marketplace/products/iphone-15-pro
```

La respuesta debe contener únicamente información necesaria para presentar y comprar el producto.

Ejemplo conceptual:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Producto",
    "slug": "producto",
    "description": "Descripción",
    "price": 199.99,
    "stock": 25,
    "is_active": true
  }
}
```

El precio mostrado aquí es únicamente informativo.

**El precio definitivo de una orden debe obtenerse nuevamente desde PostgreSQL durante la creación de la orden.**

---

# 10. Creación de órdenes

## Endpoint

```http
POST /api/orders
```

Este endpoint constituye la entrada principal para la creación segura de una orden.

### Requiere autenticación

Sí.

### Content-Type

```http
application/json
```

### Request

```json
{
  "product_id": "uuid",
  "quantity": 2,
  "affiliate_ref": "CODIGO_AFILIADO"
}
```

### Reglas de seguridad

El servidor debe:

1. verificar la sesión;
2. validar el UUID del producto;
3. validar la cantidad;
4. consultar nuevamente el producto;
5. comprobar `is_active`;
6. comprobar stock;
7. obtener el precio real desde PostgreSQL;
8. validar la referencia de afiliado;
9. crear la orden mediante una operación transaccional;
10. reservar o descontar inventario de forma atómica;
11. establecer inicialmente el estado `pending`.

El cliente **no debe enviar un precio considerado confiable**.

### Respuesta

```json
{
  "success": true,
  "order_id": "uuid",
  "status": "pending",
  "total_amount": 399.98,
  "currency": "USD",
  "message": "Orden creada correctamente. Continúa con el proceso de pago."
}
```

### Estados posibles

```text
pending
paid
processing
shipped
completed
cancelled
failed
refunded
```

La transición entre estados debe estar controlada por servidor.

---

# 11. Checkout

## Endpoint

```http
POST /api/checkout
```

El checkout representa una operación financiera y, por tanto, requiere controles superiores a los utilizados para una simple consulta del catálogo.

### Regla crítica

El servidor **no debe confiar en**:

```json
{
  "price": 100,
  "totalAmount": 100
}
```

enviados por el navegador.

Estos valores pueden utilizarse únicamente como información auxiliar o para la interfaz, pero nunca como fuente de verdad financiera.

El servidor debe recuperar:

```text
producto
precio
cantidad
stock
vendedor
comisión
moneda
estado
```

desde fuentes confiables.

### Request conceptual

```json
{
  "items": [
    {
      "id": "uuid",
      "quantity": 2
    }
  ],
  "region": "GLOBAL"
}
```

### Flujo recomendado

```text
Cliente
   │
   ▼
POST /api/checkout
   │
   ▼
Autenticación
   │
   ▼
Validación de productos
   │
   ▼
Consulta de precios reales
   │
   ▼
Validación de stock
   │
   ▼
Cálculo servidor
   │
   ▼
Comisión
   │
   ▼
Creación / actualización de orden
   │
   ▼
Estado = pending
   │
   ▼
Proveedor de pago
```

El endpoint no debe interpretar una solicitud de checkout como prueba de pago.

---

# 12. Pagos

El sistema debe separar claramente:

```text
ORDER CREATED
       ↓
PAYMENT PENDING
       ↓
PAYMENT VERIFIED
       ↓
ORDER PAID
```

Nunca:

```text
Browser → "paid": true → Database
```

La confirmación del pago debe provenir de un mecanismo verificable del proveedor de pagos, preferentemente mediante webhook o comprobación servidor-servidor.

---

# 13. Comisión de plataforma

La comisión debe calcularse exclusivamente en servidor.

Ejemplo conceptual:

```text
subtotal = Σ(precio_real × cantidad)

commission = subtotal × commission_rate

seller_amount = subtotal - commission
```

La tasa debe proceder de una configuración segura y validada.

No debe permitirse:

```json
{
  "commissionRate": 0
}
```

como mecanismo para que el cliente modifique la comisión.

---

# 14. Afiliados

Las órdenes pueden contener una referencia de afiliado:

```json
{
  "affiliate_ref": "JOHNBAZA10"
}
```

La referencia debe considerarse **no confiable hasta su validación**.

El sistema debe comprobar:

* existencia;
* estado activo;
* vigencia;
* relación válida con el programa de afiliados;
* reglas de atribución;
* ausencia de auto-referencia cuando las reglas lo prohíban.

La comisión de afiliación debe determinarse en servidor.

---

# 15. Mercado B2B

## Catálogo

```http
GET /b2b
```

Presenta productos destinados a compradores mayoristas.

Los productos B2B pueden incorporar:

```text
MOQ
precio mayorista
stock disponible
proveedor
categoría
condiciones comerciales
método de pago
```

---

# 16. Producto B2B

```http
GET /b2b/[id]
```

Obtiene el detalle de un producto mayorista.

El sistema debe validar nuevamente:

* producto existente;
* producto activo;
* stock;
* MOQ;
* precio;
* proveedor;
* condiciones comerciales.

El precio mostrado en la página B2B no constituye por sí mismo una autorización de compra.

---

# 17. Checkout B2B

El checkout B2B debe aplicar las mismas reglas de seguridad financiera del marketplace convencional.

Especialmente:

```text
precio mostrado ≠ precio confiable
stock mostrado ≠ stock reservado
solicitud de pago ≠ pago confirmado
```

La operación definitiva debe validarse en servidor.

---

# 18. Inteligencia Artificial

## Endpoint

```http
POST /api/ai/assistant
```

Este endpoint proporciona una interfaz controlada para el asistente de inteligencia artificial.

### Request

```json
{
  "message": "¿Qué productos tienen disponibilidad?"
}
```

### Response

```json
{
  "reply": "..."
}
```

### Seguridad

La clave del proveedor de IA debe permanecer exclusivamente en servidor:

```env
GEMINI_API_KEY=...
```

No debe utilizarse:

```env
NEXT_PUBLIC_GEMINI_API_KEY=...
```

para secretos.

Cualquier variable `NEXT_PUBLIC_*` puede terminar siendo accesible desde el navegador y, por tanto, no debe contener credenciales privadas.

---

# 19. Protección del endpoint de IA

El endpoint de IA debe incorporar, como mínimo:

* validación del cuerpo;
* límite de longitud del mensaje;
* rate limiting;
* protección contra abuso;
* control de costos;
* timeout de proveedor;
* manejo de respuestas inválidas;
* no exposición de la API key;
* sanitización de información sensible cuando corresponda.

Ejemplo de límite conceptual:

```text
message.length <= 4000
```

El límite definitivo debe adaptarse al modelo y al caso de uso.

---

# 20. Timeouts y servicios externos

Las llamadas externas no deben permanecer abiertas indefinidamente.

Las integraciones con:

* proveedores de IA;
* proveedores de pago;
* servicios externos;
* APIs de terceros;

deben utilizar `AbortController` y límites de tiempo razonables.

Ejemplo conceptual:

```ts
const controller = new AbortController()

const timeout = setTimeout(() => {
  controller.abort()
}, 15_000)

try {
  // llamada externa
} finally {
  clearTimeout(timeout)
}
```

---

# 21. Idempotencia

Las operaciones financieras deben evolucionar hacia un modelo idempotente.

Una solicitud repetida no debería generar dos órdenes accidentalmente.

Ejemplo:

```http
Idempotency-Key: 01JXXXXXXXXXXXX
```

La clave puede asociarse a:

```text
usuario
operación
payload
resultado
fecha de expiración
```

Esto resulta especialmente importante para:

* checkout;
* creación de órdenes;
* pagos;
* reintentos automáticos;
* webhooks.

---

# 22. Control de concurrencia

Las operaciones de inventario deben ser atómicas.

No es suficiente realizar:

```text
SELECT stock
↓
if stock >= quantity
↓
INSERT order
↓
UPDATE stock
```

porque dos solicitudes simultáneas pueden observar el mismo stock.

La arquitectura recomendada es:

```text
BEGIN
   ↓
SELECT product FOR UPDATE
   ↓
validar stock
   ↓
obtener precio
   ↓
crear order
   ↓
reservar/descontar stock
   ↓
COMMIT
```

La operación debe encapsularse preferentemente en PostgreSQL mediante una función RPC transaccional.

---

# 23. RPC recomendada para órdenes

La función:

```text
create_pending_order(
    p_buyer_id,
    p_product_id,
    p_quantity,
    p_affiliate_ref
)
```

debe constituir la fuente transaccional para la creación de órdenes.

Debe:

1. bloquear el producto;
2. comprobar que existe;
3. comprobar que está activo;
4. comprobar stock;
5. obtener precio;
6. calcular subtotal;
7. validar afiliado;
8. crear la orden;
9. crear los `order_items`;
10. reservar o descontar inventario;
11. devolver el identificador de orden;
12. devolver el total calculado por PostgreSQL.

---

# 24. Autorización

La autenticación responde:

```text
¿Quién eres?
```

La autorización responde:

```text
¿Qué puedes hacer?
```

Por tanto, no debe bastar con comprobar que existe un usuario.

El sistema debe aplicar controles según:

```text
customer
vendor
professional
company
admin
```

y cualquier rol adicional definido por el modelo de datos.

---

# 25. Protección de datos

Los endpoints privados no deben devolver información que el usuario no necesita.

Especialmente:

* hashes;
* tokens;
* claves privadas;
* credenciales;
* datos internos de proveedores;
* información financiera privada;
* datos de otros usuarios;
* información administrativa.

---

# 26. Cache

Las respuestas públicas que puedan almacenarse de manera segura pueden utilizar estrategias de caché.

Las operaciones privadas o transaccionales deben evitar caché.

Ejemplo:

```http
Cache-Control: no-store
```

especialmente para:

```text
/api/orders
/api/checkout
/api/payments
/api/auth/*
/api/ai/*
```

---

# 27. Observabilidad

Cada operación sensible debería generar un identificador único:

```ts
const requestId = crypto.randomUUID()
```

Los registros internos pueden utilizar:

```text
[orders:<requestId>]
[checkout:<requestId>]
[ai:<requestId>]
```

El `requestId` permite correlacionar:

```text
Browser
   ↓
Next.js
   ↓
Supabase
   ↓
PostgreSQL
   ↓
Proveedor externo
```

sin exponer información sensible.

---

# 28. Errores internos

Nunca debe devolverse directamente al cliente:

```ts
error.message
```

cuando el mensaje pueda contener información interna.

Incorrecto:

```json
{
  "error": "Postgres error: relation xyz does not exist..."
}
```

Correcto:

```json
{
  "success": false,
  "error": "No fue posible completar la operación.",
  "code": "ORDER_CREATION_FAILED"
}
```

El detalle técnico debe permanecer en los logs del servidor.

---

# 29. Matriz principal de endpoints

| Área        | Método | Endpoint                       | Autenticación  | Naturaleza       |
| ----------- | ------ | ------------------------------ | -------------- | ---------------- |
| Auth        | `POST` | `/auth/v1/signup`              | No             | Registro         |
| Auth        | `POST` | `/auth/v1/token`               | No             | Login            |
| Marketplace | `GET`  | `/marketplace`                 | No             | Público          |
| Producto    | `GET`  | `/marketplace/products/[slug]` | No             | Público          |
| B2B         | `GET`  | `/b2b`                         | No             | Público          |
| B2B         | `GET`  | `/b2b/[id]`                    | No             | Público          |
| Orders      | `POST` | `/api/orders`                  | Sí             | Transaccional    |
| Checkout    | `POST` | `/api/checkout`                | Sí             | Financiero       |
| AI          | `POST` | `/api/ai/assistant`            | Según política | Servicio externo |

---

# 30. Regla de oro de la arquitectura financiera

La plataforma debe asumir que **todo dato procedente del navegador puede ser manipulado**.

Por ello:

```text
Cliente
  ↓
INPUT NO CONFIABLE
  ↓
VALIDACIÓN
  ↓
AUTENTICACIÓN
  ↓
AUTORIZACIÓN
  ↓
CONSULTA DE DATOS REALES
  ↓
CÁLCULO SERVIDOR
  ↓
TRANSACCIÓN ATÓMICA
  ↓
RESULTADO
```

Nunca:

```text
Cliente
  ↓
precio enviado
  ↓
total enviado
  ↓
comisión enviada
  ↓
stock enviado
  ↓
orden pagada
```

---

# 31. Principio arquitectónico definitivo

En Credi Marketplace, **el frontend presenta; el servidor decide; PostgreSQL garantiza la consistencia; el proveedor de pagos confirma el pago**.

Esta separación constituye la base de seguridad para construir una plataforma de comercio electrónico escalable con Next.js, React, Supabase y PostgreSQL.
