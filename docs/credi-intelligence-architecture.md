# CREDI Intelligence — Arquitectura oficial

## 1. Principio

Credi Marketplace es un ecosistema tecnológico propio. La inteligencia artificial y la automatización se organizan como capacidades de Credi, no como una capa de identidad de un proveedor externo.

**CREDI INTELLIGENCE** funciona como cerebro transversal y coordina módulos especializados sobre los dominios existentes del marketplace.

## 2. Taxonomía oficial

- **CREDI INTELLIGENCE** — orquestación transversal, señales, decisiones y auditoría.
- **CREDI-CREDIT AI** — inteligencia crediticia, capacidad y riesgo.
- **CREDI-SUPPLY AI** — abastecimiento e incorporación de fuentes comerciales autorizadas.
- **CREDI-CATALOG AI** — creación, normalización y optimización de catálogos.
- **CREDI-FLEX AI** — inteligencia logística y asignación de entregas.
- **CREDI-LOCKER** — casilleros inteligentes y puntos de entrega.
- **CREDI-ESCROW** — custodia y liberación controlada de fondos.
- **CREDI-LIVE** — comercio en vivo.
- **CREDI-AFFILIATE AI** — afiliación, atribución y comisiones.
- **CREDI-REPUTATION** — reputación comercial y confianza transaccional.
- **CREDI-AUTOMATION** — automatización y agentes gobernados.

Los nombres de código pueden utilizar guiones; las interfaces de usuario pueden representar el nombre comercial con espacios, por ejemplo `CREDI-CREDIT AI`.

## 3. Arquitectura de referencia

```text
                         CREDI MARKETPLACE
                                  │
                         CREDI INTELLIGENCE
                                  │
          ┌─────────────┬────────┼────────┬─────────────┐
          │             │        │        │             │
       CREDIT        SUPPLY   CATALOG    FLEX          LIVE
          │             │        │        │             │
          └─────────────┴────────┼────────┴─────────────┘
                                  │
                    REPUTATION / ESCROW / PAYMENTS
                                  │
                    AFFILIATE / AUTOMATION / LOCKER
```

## 4. CREDI-SUPPLY AI

La arquitectura no debe depender de una sola empresa de abastecimiento. Cada proveedor autorizado se integra por un adaptador que transforma su catálogo y capacidades al modelo de Credi.

```text
Proveedor autorizado
        │
        ▼
CREDI-SUPPLY AI
        │
   Normalización
        │
   Reglas / compliance
        │
        ▼
Productos / Listings / Inventory
```

`Dropshipping` es una modalidad comercial soportada por CREDI-SUPPLY AI. No es el nombre del módulo ni la identidad de Credi.

## 5. CREDI INTELLIGENCE y el dominio

La capa de inteligencia no duplica `products`, `listings`, `inventory`, `orders`, `stores`, afiliados, reputación ni B2B. Esas tablas siguen siendo fuentes de verdad de sus respectivos dominios.

La persistencia transversal se concentra en:

```text
credi_intelligence_modules
credi_intelligence_events
credi_intelligence_decisions
```

### Módulos

Registro canónico de las capacidades de inteligencia de Credi, su estado, versión y configuración no secreta.

### Eventos

Bitácora de señales y resultados de inferencia. Puede asociarse opcionalmente a un usuario y a una entidad de dominio mediante `entity_type` y `entity_id`.

### Decisiones

Registro versionado de decisiones de inteligencia. Debe conservar, cuando corresponda, puntuación, nivel de confianza, versión del modelo, racional estructurado, estado y fecha de revisión.

## 6. Gobernanza

Las capacidades que afecten acceso, pagos, riesgo, elegibilidad o cumplimiento deben ejecutarse server-side. Una inferencia de IA no sustituye una regla de negocio obligatoria ni una verificación jurídica, financiera o de identidad que la plataforma exija.

Para decisiones sensibles debe existir posibilidad de revisión humana y trazabilidad suficiente para reconstruir qué módulo, versión y señales participaron en la decisión.

Los datos de entrada deben minimizarse y los secretos nunca deben almacenarse en los registros de inteligencia.

## 7. Integraciones externas

Las integraciones externas son adaptadores, no el núcleo de identidad de Credi. Cada integración debe aislar:

- credenciales y secretos;
- OAuth y permisos;
- límites y errores del proveedor;
- normalización de datos;
- términos contractuales y disclosures;
- atribución y comisiones;
- observabilidad y auditoría.

Esto permite reemplazar o añadir proveedores sin rediseñar el modelo de dominio de Credi.

## 8. Regla de nomenclatura

En código, documentación y UI de primera parte:

- usar los nombres oficiales Credi;
- evitar presentar una tecnología de tercero como producto propio;
- usar `Dropshipping` únicamente como modalidad cuando sea necesario;
- mantener separado el nombre comercial del proveedor y el nombre del módulo Credi;
- no crear módulos duplicados que ya estén representados en el dominio existente.

## 9. Despliegue

GitHub es la fuente de código. Supabase es la fuente canónica de persistencia, seguridad y funciones de datos. Vercel es la plataforma de ejecución y despliegue del frontend/backend Next.js.

La configuración final de Vercel debe quedar vinculada al repositorio de Credi y utilizar únicamente variables de entorno server-side para secretos. El despliegue de producción debe comprobar build, typecheck, tests, seguridad y estado de la integración antes de declararse operativo.
