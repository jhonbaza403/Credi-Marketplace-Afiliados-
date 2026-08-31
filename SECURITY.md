````markdown
# Security Policy

Credi Marketplace considera la seguridad una parte fundamental de la arquitectura de la plataforma.

Esta política establece los requisitos mínimos para proteger:

- cuentas de usuarios;
- autenticación y autorización;
- información de perfiles;
- productos y vendedores;
- órdenes y transacciones;
- pagos;
- afiliados;
- información B2B;
- APIs;
- integraciones externas;
- datos almacenados en Supabase;
- infraestructura de despliegue;
- secretos y credenciales.

---

## Supported Versions

Credi Marketplace mantiene como versión soportada la rama principal activa del proyecto y las versiones actualmente utilizadas en producción.

| Version | Supported |
| ------- | --------- |
| `main` | Yes |
| Older releases | Limited / No |

Las versiones antiguas pueden dejar de recibir correcciones de seguridad cuando sean incompatibles con las dependencias o arquitectura actuales.

---

# Security Principles

Credi Marketplace sigue estos principios:

1. **Mínimo privilegio**
2. **Defensa en profundidad**
3. **Server-side authorization**
4. **Separación entre cliente y servidor**
5. **Validación de entradas**
6. **Protección de secretos**
7. **RLS para datos protegidos**
8. **Auditoría de operaciones sensibles**
9. **Idempotencia en operaciones críticas**
10. **Verificación independiente de webhooks**
11. **Actualización periódica de dependencias**
12. **Fail closed en operaciones sensibles**

La seguridad del frontend nunca debe considerarse un mecanismo suficiente de autorización.

---

# Reporting Security Vulnerabilities

Si encuentras una vulnerabilidad de seguridad, evita publicarla en:

- Issues públicos;
- Pull Requests públicos;
- comentarios;
- documentación pública;
- redes sociales;
- chats públicos.

Las vulnerabilidades deben comunicarse de forma privada al equipo responsable del proyecto.

Cuando sea posible, el reporte debe incluir:

- descripción de la vulnerabilidad;
- componente afectado;
- pasos generales para reproducirla;
- impacto potencial;
- versión afectada;
- evidencia técnica no sensible;
- posible mitigación.

No incluyas credenciales reales, tokens, claves privadas ni información personal innecesaria.

---

# Reporting

## Responsible Disclosure

Solicitamos que las vulnerabilidades se comuniquen de manera responsable para permitir su investigación y corrección antes de una divulgación pública.

Los reportes deben contener únicamente la información necesaria para demostrar el problema.

No se debe realizar:

- acceso no autorizado a cuentas de terceros;
- extracción masiva de información;
- modificación o eliminación de datos;
- interrupción deliberada del servicio;
- pruebas destructivas;
- ingeniería social contra usuarios o personal;
- explotación más allá de lo necesario para demostrar la vulnerabilidad.

---

# Secrets and Credentials

Los secretos deben mantenerse exclusivamente en sistemas de gestión de secretos o variables de entorno apropiadas.

Nunca se deben publicar:

- contraseñas;
- tokens;
- API keys;
- claves privadas;
- credenciales de base de datos;
- secretos de Supabase;
- service-role keys;
- claves de firma;
- secretos de webhooks;
- credenciales de proveedores de pago;
- credenciales de terceros.

## Environment Variables

Las variables públicas deben distinguirse claramente de las variables exclusivamente de servidor.

Las variables que contienen secretos nunca deben utilizar el prefijo:

```text
NEXT_PUBLIC_
````

Ejemplo incorrecto:

```text
NEXT_PUBLIC_SUPABASE_SECRET_KEY=
```

Ejemplo correcto:

```text
SUPABASE_SECRET_KEY=
```

Las claves privadas y secretos deben permanecer fuera del código fuente.

---

# Supabase Security

Credi Marketplace utiliza Supabase como plataforma de backend y base de datos.

Las operaciones que acceden a datos protegidos deben estar sujetas a controles de autenticación y autorización.

## Row Level Security

Supabase Row Level Security (RLS) es obligatorio para las tablas que contienen información protegida o datos cuya lectura o modificación dependa del usuario, rol o contexto de autorización.

Las políticas deben seguir el principio de mínimo privilegio.

No se debe confiar exclusivamente en:

```text
UI
Frontend
React
Next.js Client Components
```

para proteger datos.

La autorización debe reforzarse mediante:

* RLS;
* autorización server-side;
* validación de sesión;
* validación de roles;
* controles de acceso específicos.

---

# Supabase Secret Keys

Las claves secretas de Supabase deben utilizarse únicamente en código server-side.

Nunca deben enviarse al navegador.

Nunca deben aparecer en:

```text
Client Components
NEXT_PUBLIC_*
HTML
logs públicos
repositorios
issues
pull requests
```

Los archivos `.env.local`, `.env.production` y otros archivos que contengan secretos no deben formar parte del repositorio.

---

# Authentication

Las operaciones autenticadas deben verificar la sesión del usuario en el servidor cuando el recurso lo requiera.

La existencia de una sesión válida no implica automáticamente autorización para cualquier operación.

Debe distinguirse entre:

```text
Authentication
```

y:

```text
Authorization
```

La autenticación determina quién es el usuario.

La autorización determina qué puede hacer.

---

# Administrative Access

Las rutas administrativas requieren autorización server-side.

Ejemplos:

```text
/admin
/dashboard/admin
```

La protección debe realizarse mediante mecanismos server-side como:

```text
requireAdmin()
```

y controles equivalentes.

Ocultar un enlace administrativo en el frontend no constituye una medida de seguridad.

Un usuario no autorizado no debe poder acceder a operaciones administrativas simplemente enviando una solicitud HTTP directamente.

---

# API Security

Las APIs deben implementar, según corresponda:

* autenticación;
* autorización;
* validación de entrada;
* validación de tipos;
* control de métodos HTTP;
* manejo seguro de errores;
* protección contra abuso;
* límites de tamaño;
* idempotencia en operaciones críticas;
* controles de acceso;
* auditoría de operaciones sensibles.

Las entradas externas nunca deben considerarse confiables.

Las validaciones deben ejecutarse en el servidor.

---

# Input Validation

Los datos procedentes de:

* formularios;
* URL;
* query parameters;
* headers;
* cookies;
* APIs externas;
* webhooks;
* clientes móviles;
* integraciones;

deben validarse antes de ser utilizados.

Credi Marketplace utiliza TypeScript y esquemas de validación para reducir errores y entradas inválidas.

Las validaciones del cliente no sustituyen las validaciones del servidor.

---

# Payment Security

Las operaciones relacionadas con pagos deben ejecutarse server-side.

Nunca se debe considerar suficiente una confirmación enviada por el navegador.

La confirmación de pagos debe apoyarse en mecanismos verificables proporcionados por el proveedor correspondiente.

Cuando el proveedor utilice webhooks, estos deben:

* verificarse criptográficamente cuando corresponda;
* validar autenticidad;
* validar eventos;
* validar identificadores;
* validar estados;
* implementar idempotencia;
* evitar procesamientos duplicados;
* registrar eventos relevantes sin almacenar secretos.

Nunca se debe aceptar una solicitud del cliente como prueba definitiva de que un pago fue realizado.

---

# Webhooks

Los webhooks deben considerarse entradas externas no confiables hasta que sean verificados.

Las rutas de webhook deben implementar:

1. autenticación o verificación de firma cuando el proveedor la soporte;
2. validación del payload;
3. validación del evento;
4. protección contra replay cuando corresponda;
5. idempotencia;
6. manejo seguro de errores;
7. registro de eventos sin secretos.

Un webhook repetido no debe producir múltiples efectos financieros o comerciales.

---

# Idempotency

Las operaciones sensibles deben ser idempotentes cuando exista riesgo de reintentos.

Esto incluye, cuando corresponda:

* creación de órdenes;
* pagos;
* confirmaciones;
* webhooks;
* operaciones financieras;
* procesos de inventario;
* operaciones de afiliados.

Un reintento de la misma operación no debe crear efectos duplicados.

---

# Orders and Checkout

Las órdenes y procesos de checkout deben validarse en el servidor.

El servidor debe comprobar nuevamente:

* usuario;
* productos;
* cantidades;
* disponibilidad;
* precios;
* moneda;
* descuentos;
* impuestos cuando correspondan;
* estado de la orden;
* autorización;
* integridad de la operación.

Nunca debe confiarse únicamente en los valores enviados desde el navegador.

---

# Inventory

Las operaciones de inventario deben ejecutarse de forma consistente y segura.

Las actualizaciones críticas deben evitar condiciones de carrera y modificaciones no autorizadas.

Cuando corresponda deben utilizarse:

* transacciones;
* RPC;
* restricciones de base de datos;
* validaciones server-side;
* idempotencia;
* controles de concurrencia.

---

# Affiliate Security

Las operaciones relacionadas con afiliados deben proteger:

* identificadores de afiliados;
* referencias;
* atribuciones;
* comisiones;
* conversiones;
* estados de pago.

Las comisiones y atribuciones no deben determinarse exclusivamente a partir de datos manipulables desde el cliente.

---

# B2B Security

Las operaciones B2B deben aplicar controles adicionales cuando involucren:

* empresas;
* vendedores;
* compradores;
* órdenes mayoristas;
* precios;
* inventario;
* información comercial.

Los permisos deben validarse server-side y mediante políticas de acceso apropiadas.

---

# File and Media Security

Los archivos proporcionados por usuarios deben tratarse como contenido no confiable.

Debe evitarse:

* ejecutar archivos subidos;
* confiar en extensiones;
* aceptar tipos MIME sin validación;
* almacenar secretos en archivos públicos;
* utilizar nombres de archivo inseguros.

Los archivos deben almacenarse utilizando mecanismos apropiados de almacenamiento y permisos.

Los vídeos y archivos grandes no deben almacenarse directamente en el servidor de Next.js cuando exista una solución de almacenamiento especializada apropiada.

---

# HTTP Security

Credi Marketplace utiliza headers de seguridad HTTP cuando son compatibles con la aplicación.

Entre ellos:

```text
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
Content-Security-Policy
X-Frame-Options
Cross-Origin-Opener-Policy
Cross-Origin-Resource-Policy
```

La configuración debe revisarse cuando se agreguen nuevos proveedores, dominios o integraciones.

---

# Content Security Policy

La Content Security Policy debe mantenerse tan restrictiva como sea posible.

No se debe agregar:

```text
unsafe-eval
```

como solución genérica para errores de compilación.

Cualquier excepción de CSP debe estar justificada por una dependencia o integración real.

---

# Cookies and Sessions

Las cookies de sesión deben utilizar las configuraciones de seguridad apropiadas para el entorno.

Cuando corresponda deben utilizarse atributos como:

```text
Secure
HttpOnly
SameSite
```

Las credenciales de sesión no deben almacenarse en mecanismos inseguros del navegador cuando exista una alternativa apropiada.

---

# Error Handling

Los errores enviados al cliente no deben revelar:

* secretos;
* tokens;
* claves;
* stack traces internos;
* consultas SQL;
* información de infraestructura;
* rutas internas sensibles;
* credenciales;
* detalles innecesarios de servicios internos.

Los detalles técnicos deben permanecer en logs server-side protegidos.

---

# Logging and Audit

Las operaciones administrativas y de alto impacto deben poder auditarse cuando corresponda.

Los logs no deben contener:

* contraseñas;
* tokens;
* claves privadas;
* secretos;
* datos de pago sensibles;
* información personal innecesaria.

Los logs deben limitarse a la información necesaria para diagnóstico, seguridad y auditoría.

---

# Dependencies

Las dependencias deben mantenerse actualizadas.

Antes de una versión de producción deben comprobarse:

```bash
npm audit --audit-level=high
```

Además deben ejecutarse:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Las vulnerabilidades críticas o de alta severidad deben investigarse antes de liberar una versión cuando afecten al proyecto.

---

# CI/CD Security

El pipeline de integración y despliegue debe impedir una liberación cuando fallen las comprobaciones de calidad y seguridad definidas por el proyecto.

Como mínimo:

```text
lint
typecheck
unit tests
E2E tests
build
high-severity npm audit
```

Las credenciales de CI/CD deben almacenarse como secretos del proveedor correspondiente.

Nunca deben escribirse directamente en:

```text
.gitlab-ci.yml
GitHub Actions
Dockerfile
source code
```

---

# Git Security

Nunca deben confirmarse en Git:

```text
.env
.env.local
.env.production
.env.development.local
.env.test
```

ni:

```text
private keys
service credentials
database passwords
API keys
payment secrets
Supabase secret keys
```

El archivo:

```text
.env.example
```

puede mantenerse en el repositorio siempre que contenga únicamente valores ficticios o placeholders.

---

# Secret Rotation

Si una credencial se expone accidentalmente:

1. Revocar o rotar inmediatamente la credencial.
2. Revisar dónde fue publicada.
3. Eliminarla del código futuro.
4. Revisar logs y accesos cuando corresponda.
5. Generar una nueva credencial.
6. Actualizar el entorno de despliegue.
7. Verificar que la credencial anterior ya no sea válida.

Eliminar una clave de Git no significa que haya dejado de estar comprometida.

---

# Security Testing

Las pruebas de seguridad deben incluir, cuando corresponda:

* autenticación;
* autorización;
* RLS;
* acceso administrativo;
* APIs;
* webhooks;
* checkout;
* pagos;
* idempotencia;
* validación de entradas;
* sesiones;
* protección contra acceso directo a recursos.

Las pruebas E2E deben comprobar tanto los casos permitidos como los casos rechazados.

---

# Production Deployment

Antes de desplegar a producción se recomienda verificar:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm audit --audit-level=high
```

También debe verificarse que:

* las variables de entorno estén configuradas;
* ningún secreto esté incluido en el bundle del cliente;
* las políticas RLS estén activas;
* las rutas administrativas estén protegidas;
* los webhooks estén configurados correctamente;
* las URLs de producción sean correctas;
* las credenciales de desarrollo no se utilicen en producción.

---

# Security Incident Response

Ante un incidente de seguridad:

1. Identificar el alcance.
2. Contener el incidente.
3. Revocar credenciales comprometidas.
4. Preservar evidencia técnica relevante.
5. Determinar los sistemas afectados.
6. Aplicar la mitigación.
7. Corregir la vulnerabilidad.
8. Rotar secretos cuando corresponda.
9. Verificar la corrección.
10. Documentar el incidente.

Cuando corresponda, se deberán realizar las notificaciones exigidas por las leyes y regulaciones aplicables.

---

# Security Review Checklist

Antes de una liberación importante:

* [ ] No existen secretos en Git.
* [ ] No existen secretos con `NEXT_PUBLIC_`.
* [ ] Supabase RLS está habilitado para datos protegidos.
* [ ] Las rutas administrativas tienen autorización server-side.
* [ ] Las APIs validan entradas.
* [ ] Los pagos se verifican server-side.
* [ ] Los webhooks se verifican.
* [ ] Las operaciones críticas son idempotentes.
* [ ] Las sesiones están protegidas.
* [ ] Los errores no exponen información sensible.
* [ ] Los logs no contienen secretos.
* [ ] Las dependencias fueron auditadas.
* [ ] ESLint pasa.
* [ ] TypeScript pasa.
* [ ] Tests unitarios pasan.
* [ ] Tests E2E pasan.
* [ ] El build de producción pasa.
* [ ] Las variables de producción están configuradas correctamente.

---

# Scope

Esta política cubre principalmente:

```text
src/
supabase/
tests/
Next.js
Supabase
APIs
autenticación
autorización
pagos
webhooks
CI/CD
configuración de producción
```

Las vulnerabilidades relacionadas exclusivamente con servicios externos deben reportarse también al proveedor correspondiente cuando sea apropiado.

---

# Disclosure

La divulgación pública de una vulnerabilidad debe realizarse de forma responsable y, cuando sea posible, después de que exista una corrección o mitigación disponible.

No se deben divulgar públicamente credenciales, secretos, datos personales o información que permita comprometer sistemas.

---

# Contact

Para reportes privados de seguridad, utiliza el canal de contacto de seguridad designado por los mantenedores del proyecto.

No publiques vulnerabilidades sensibles en Issues o Pull Requests públicos.

---

# Final Security Rule

La seguridad no debe depender de una única capa.

Credi Marketplace aplica una estrategia de defensa en profundidad:

```text
Browser
   ↓
Next.js
   ↓
Server-side authorization
   ↓
API validation
   ↓
Supabase
   ↓
RLS
   ↓
Database constraints
   ↓
Audit / logging
```

Ninguna capa individual debe considerarse suficiente para proteger una operación crítica.

````

### Un cambio especialmente importante

En tu política original tenías:

> `CI must pass lint, typecheck, tests, build, and high-severity npm audit checks before release.`

Lo amplié para que **E2E también forme parte de la validación**, porque ya incorporamos Playwright al proyecto:

```text
lint
↓
typecheck
↓
unit tests
↓
E2E
↓
audit
↓
build
````

Y mantuve explícitamente que **RLS + autorización server-side** son capas diferentes. Eso es importante para tu arquitectura con Supabase.

Como siguiente paso, conviene revisar el **`tests/verify-structure.mjs`** que preparaste para que compruebe automáticamente que estos archivos de seguridad, configuración, Supabase y pruebas realmente existan antes de permitir el build.
