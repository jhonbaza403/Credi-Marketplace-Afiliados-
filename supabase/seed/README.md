# Supabase Seed

Datos iniciales controlados para el desarrollo y las pruebas de **Credi Marketplace**.

## Propósito

El seed contiene únicamente datos base y deterministas que permiten levantar un entorno local o controlado con una estructura funcional mínima.

El archivo principal del seed es:

```text
supabase/seed.sql
```

Las migraciones de esquema permanecen separadas en:

```text
supabase/migrations/
```

Esta separación es intencional: las migraciones construyen y evolucionan la base de datos; el seed carga datos iniciales no sensibles.

## Qué contiene actualmente

El `seed.sql` crea de forma idempotente:

- 6 categorías principales.
- 3 subcategorías de Tecnología.
- Una validación de integridad que confirma la existencia de las 6 categorías base.

El script usa identificadores UUID deterministas para que los entornos locales sean reproducibles.

## Qué no debe contener

Nunca colocar en este directorio ni en `supabase/seed.sql`:

- contraseñas;
- tokens o API keys;
- claves privadas;
- secretos de Supabase;
- credenciales de terceros;
- datos personales reales;
- medios de pago reales;
- usuarios de producción;
- información financiera real.

Los usuarios y perfiles que dependan de `auth.users` deben generarse mediante el flujo de autenticación o mediante fixtures de integración controlados.

## Productos, tiendas y datos dependientes

No se insertan productos, tiendas u otras entidades que necesiten propietarios, relaciones de autenticación o claves externas válidas cuando hacerlo podría producir registros huérfanos.

Los datos de pruebas más complejos deben mantenerse como fixtures específicos de integración o pruebas automatizadas, no mezclados con el seed base.

## Reglas de mantenimiento

### 1. El seed debe ser SQL puro

`supabase/seed.sql` debe contener únicamente SQL ejecutable. No envolver el archivo completo en fences Markdown como ` ```sql `.

### 2. Debe ser seguro para entornos controlados

El seed está diseñado para desarrollo, pruebas y staging controlado. No debe utilizarse para introducir secretos ni información real.

### 3. Debe ser reproducible

Siempre que sea posible, usar datos deterministas e instrucciones idempotentes como `ON CONFLICT` para evitar duplicaciones al ejecutar repetidamente el entorno local.

### 4. No sustituye las migraciones

Nunca usar el seed para crear tablas, índices, funciones, triggers, políticas RLS o cambios permanentes de esquema.

Los cambios estructurales pertenecen a:

```text
supabase/migrations/
```

### 5. No depender de credenciales locales

El contenido del seed no debe requerir que una clave, token o secreto esté escrito dentro del repositorio.

## Ejecución local

La configuración de Supabase se encuentra en:

```text
supabase/config.toml
```

Para un entorno local, primero aplicar las migraciones y después cargar el seed usando el flujo estándar de Supabase CLI definido por el proyecto.

Comandos habituales:

```bash
supabase start
supabase db reset
```

`supabase db reset` reconstruye el entorno local y vuelve a aplicar las migraciones y el seed configurado por Supabase.

> Ejecutar comandos de Supabase CLI desde la raíz del repositorio y verificar la versión de la CLI utilizada por el equipo/CI.

## Relación con las pruebas

Los tests SQL de seguridad, RLS, concurrencia, idempotencia, pagos y máquina de estados se encuentran en:

```text
supabase/tests/
```

El seed debe proporcionar únicamente la base común y estable que necesiten esos entornos. Las pruebas que requieran estados específicos pueden crear y limpiar sus propios fixtures.

## Checklist antes de modificar el seed

Antes de hacer commit, comprobar que:

- el archivo sigue siendo SQL válido;
- no contiene secretos ni credenciales;
- no crea usuarios de producción;
- no introduce registros huérfanos;
- las inserciones siguen siendo reproducibles;
- las migraciones continúan siendo la única fuente de cambios de esquema;
- las pruebas SQL relacionadas siguen pasando.

## Política de datos

Este directorio forma parte de la infraestructura de datos del proyecto. Cualquier dataset de demostración debe ser sintético, mínimo y reemplazable. Nunca utilizar información de clientes, vendedores o transacciones reales como seed.

---

**Credi Marketplace — Supabase Seed**  
Datos deterministas, no sensibles y separados de las migraciones de esquema.
