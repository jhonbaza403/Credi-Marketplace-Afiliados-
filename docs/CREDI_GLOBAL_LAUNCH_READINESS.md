# CREDI GLOBAL — Matriz de preparación y certificación de lanzamiento

**Estado:** PLAN DE CERTIFICACIÓN — NO AUTORIZA LANZAMIENTO  
**Arquitectura canónica:** Vercel + Supabase + Stripe + Cloudflare Stream  
**Orquestación:** CREDI INTELLIGENCE (C.I.)  
**Fuente de código:** `jhonbaza403/Credi-Marketplace-Afiliados-`  
**Regla:** ninguna capacidad se considera operativa por existir en el código, por tener variables configuradas o por superar un build. Requiere evidencia funcional en el entorno objetivo.

## 1. Objetivo y criterios de salida

CREDI GLOBAL se considerará listo para un lanzamiento internacional controlado únicamente cuando:

1. El commit exacto candidato esté desplegado en Vercel Production y el dominio canónico sirva ese mismo commit.
2. Las migraciones locales y remotas estén reconciliadas, sin versiones duplicadas ni migraciones pendientes sin plan.
3. Las tablas expuestas tengan RLS y privilegios mínimos; las tablas internas permanezcan inaccesibles a clientes no privilegiados.
4. Autenticación, sesiones, recuperación, MFA/passkeys y controles de roles superen pruebas con cuentas separadas.
5. Compra, pago, liquidación, comisión, reembolso y conciliación superen pruebas con Stripe en modo de prueba; cualquier operación Live requiere autorización del titular.
6. CREDI LIVE complete emisor → Cloudflare Stream → dos espectadores independientes → desconexión/reconexión → replay reproducible.
7. Los recorridos B2C, vendedor, afiliado, B2B, chat, contenido social y soporte pasen E2E con datos de prueba.
8. Observabilidad, alertas, copias de seguridad y restauración estén demostradas.
9. Se complete una revisión legal por jurisdicción antes de habilitar transacciones en cada país.
10. Exista un plan de soporte, incidentes, reversión y comunicación de interrupciones.

## 2. Arquitectura que debe preservarse

- **Vercel:** Next.js App Router, frontend, Route Handlers y despliegue.
- **Supabase:** PostgreSQL, Auth, RLS, Storage, Realtime y funciones autorizadas.
- **Stripe:** pagos, Connect/liquidaciones cuando sean elegibles, reembolsos y webhooks.
- **Cloudflare Stream:** ingesta y entrega audiovisual de CREDI LIVE.
- **CREDI INTELLIGENCE:** coordinación de capacidades, permisos, auditoría y automatizaciones.
- **GitHub Actions:** CI, controles de seguridad y puertas de despliegue.

No introducir Cloudflare Workers/OpenNext como runtime principal. No duplicar clientes Supabase, modelos de dominio, sistemas de pagos ni motores de IA. Los proveedores externos se encapsulan mediante adaptadores y no sustituyen la fuente de verdad de CREDI.

## 3. Matriz de certificación

| Dominio | Evidencia obligatoria | Estado inicial |
|---|---|---|
| Repositorio y arquitectura | Inventario de rutas, APIs, módulos y dependencias | En revisión |
| Build y CI | Lint, TypeScript, unitarias, E2E, build y seguridad en el SHA candidato | Parcial; revisar por SHA |
| Vercel Production | Deployment READY, target production, commit exacto y dominio validado | Pendiente de confirmar |
| Supabase migrations | Comparación completa local/remota y prueba de migración | Parcial; historial consultado |
| RLS y privilegios | Auditoría de tablas, vistas, funciones, Storage y roles | Parcial |
| Auth y perfiles | Pruebas con usuario, vendedor, administrador y propietario | Parcial |
| Pagos y Stripe | Checkout, webhook, idempotencia, disputa, reembolso y conciliación | No certificado |
| Marketplace B2C | Producto, inventario, carrito, pedido, entrega y devolución | No certificado E2E |
| Vendedores y afiliados | Alta, atribución, comisión, elegibilidad y liquidación | No certificado E2E |
| B2B | Verificación, cotización, adjudicación, pedido y liquidación | No certificado E2E |
| Social | Publicación, moderación, privacidad, reportes y apelaciones | No certificado E2E |
| Credi Chat | Pruebas con dos cuentas, membresía, permisos y llamadas | No certificado E2E |
| CREDI LIVE | Emisión real, dos espectadores, recuperación y replay | No certificado E2E |
| CREDI INTELLIGENCE | Permisos, límites, auditoría, evaluación y aprobación humana | Parcial |
| Internacionalización | Idiomas, monedas, zonas horarias, direcciones y reglas por país | No certificado |
| Legal y fiscal | Matriz país/producto, privacidad, consumo, impuestos y pagos | Revisión requerida |
| Observabilidad | Métricas, trazas, alertas, incidentes y runbooks | Pendiente de demostrar |
| Continuidad | Backup, restauración, RTO/RPO y rollback | Pendiente de demostrar |
| Soporte y confianza | Casos, SLA, escalamiento, apelaciones y base de conocimiento | Parcial |
| Rendimiento | Pruebas de carga, latencia, límites y capacidad | No certificado |

## 4. Puertas obligatorias de seguridad

- Ninguna clave service-role, Stripe secret, token Stream o credencial de proveedor puede aparecer en el cliente, repositorio o logs.
- Las decisiones de autorización no pueden basarse en metadatos editables por el usuario.
- Las políticas UPDATE deben impedir reasignación de propietario y elevación de privilegios.
- Las vistas expuestas deben respetar RLS (por ejemplo, `security_invoker` donde corresponda).
- Las funciones privilegiadas deben tener esquema, permisos EXECUTE y validación de identidad explícitos.
- Los webhooks deben verificar firma, ventana temporal cuando aplique e idempotencia.
- Los límites de tasa y controles de coste deben proteger endpoints de IA, SMS, pagos y medios.
- Los datos privados de KYC, documentos, mensajes y perfiles no deben exponerse en consultas públicas.
- No se debe abrir una tabla sin políticas para silenciar un advisor; primero se verifica su exposición y el modelo de acceso previsto.

## 5. Pruebas de aceptación de negocio

### Compra y pago
1. Crear un producto de prueba y reservar inventario.
2. Completar checkout en Stripe test mode.
3. Procesar el webhook firmado una sola vez y repetirlo para probar idempotencia.
4. Confirmar transición de pedido e inventario sin duplicación.
5. Emitir reembolso de prueba y verificar ledger/conciliación.

### Afiliación
1. Crear vínculo de afiliado elegible.
2. Registrar clic y atribución.
3. Completar compra de prueba.
4. Verificar comisión, estado, reversión por reembolso y auditoría.
5. Confirmar que el usuario no puede modificar su comisión ni liquidación.

### CREDI LIVE
1. Autenticar al propietario de la sala.
2. Crear/obtener Live Input mediante el adaptador autorizado.
3. Emitir desde un encoder RTMPS o SRT.
4. Verificar reproducción desde dos clientes independientes.
5. Simular desconexión y reconexión.
6. Confirmar cierre de sesión, webhook firmado y replay procesado.
7. Conservar IDs, timestamps y resultados sin registrar secretos.

### Social y Chat
1. Probar publicación pública, privada y comercial con usuarios separados.
2. Confirmar moderación, edición, retirada, denuncia y apelación.
3. Probar conversación individual y grupo con dos o más cuentas.
4. Confirmar membresía, lectura/escritura, bloqueo y privacidad.

## 6. Internacionalización y lanzamiento por jurisdicción

No declarar cobertura mundial genérica. Mantener una matriz de disponibilidad por país que indique para cada capacidad: habilitada, restringida o no disponible.

La matriz debe cubrir:
- elegibilidad de Stripe y payouts;
- impuestos, facturación y obligaciones del vendedor;
- privacidad, transferencias internacionales y retención;
- protección del consumidor, desistimiento y devoluciones;
- productos restringidos, publicidad y propiedad intelectual;
- logística, aduanas, direcciones y soporte lingüístico.

La expansión debe comenzar con un conjunto limitado de jurisdicciones legal y operativamente revisadas, y ampliarse mediante aprobación documentada.

## 7. Operación, recuperación y soporte

Antes de habilitar el tráfico general deben existir:
- dashboard de salud real por integración (configuración no equivale a conectividad);
- alertas para fallos de pago, webhook, Auth, Storage y LIVE;
- trazabilidad correlacionada por request/operation ID;
- procedimiento de respuesta a incidentes y responsables;
- backups verificados y simulacro de restauración;
- estrategia de rollback de aplicación y migraciones compatibles;
- límites de gasto y cuotas para servicios externos;
- centro de atención con escalamiento humano y registro de resolución.

## 8. Gestión de hallazgos actuales

Los siguientes puntos se deben cerrar o aceptar formalmente antes del lanzamiento:

- **Vercel:** el historial consultado muestra despliegues READY de Preview, pero el deployment de producción más reciente asociado a `main` aparece cancelado; el último READY de producción consultado corresponde a un commit anterior. Confirmar el dominio y el SHA que realmente sirve tráfico.
- **Supabase:** el proyecto principal aparece ACTIVE_HEALTHY. La auditoría consultada detectó 0 de 160 tablas públicas base sin RLS.
- **`credi_supply_sources`:** RLS está habilitado, sin políticas, y los roles anon/authenticated no tienen SELECT; service_role sí. Mantener privado salvo que el modelo de negocio requiera otra cosa.
- **Password security:** el advisor informa que la protección de contraseñas comprometidas está deshabilitada. Evaluar su activación según las capacidades y plan de Supabase; no cambiar facturación sin aprobación.
- **Migraciones:** comparar cada versión del repositorio con el historial remoto antes de aplicar cualquier DDL. No volver a ejecutar migraciones ya aplicadas.
- **LIVE:** CI verde y código del adaptador no prueban una transmisión real. Se requiere encoder, credenciales Stream de Preview, dos espectadores y replay.
- **Stripe:** no utilizar pagos reales como prueba técnica; usar test mode hasta que el titular autorice el paso a Live.
- **Legal:** la certificación técnica no sustituye la revisión jurídica por jurisdicción.

## 9. Reglas de decisión Go / No-Go

**GO limitado:** solo para países, módulos y capacidades que tengan evidencia aprobada y controles operativos activos.

**NO-GO:** si existe cualquiera de estos casos:
- vulnerabilidad crítica/alta sin mitigación aceptada;
- acceso cruzado entre usuarios o elevación de privilegios;
- cobro, comisión o liquidación duplicada;
- webhook no autenticado;
- migración no reconciliada;
- deployment no identificado o no verificable;
- LIVE anunciado como activo sin emisión real;
- falta de capacidad de recuperación;
- operación comercial en país sin revisión legal requerida.

## 10. Registro de evidencias por cada prueba

Cada evidencia debe registrar:
- identificador de prueba;
- commit SHA y deployment ID;
- entorno y jurisdicción;
- fecha/hora UTC;
- actor de prueba (cuenta sintética, nunca datos reales innecesarios);
- resultado PASS / FAIL / BLOCKED / NOT RUN;
- logs sanitizados y referencias;
- incidencia asociada y responsable;
- aprobación del responsable cuando sea una puerta manual.

Las pruebas bloqueadas o no ejecutadas nunca se cuentan como aprobadas.

## 11. Secuencia de ejecución

1. Consolidar el trabajo existente en la rama de remediación ya abierta; no abrir otra rama/PR por defecto.
2. Confirmar CI y Preview sobre el SHA final.
3. Revisar y cerrar la discrepancia de despliegue de producción sin promover automáticamente.
4. Completar auditoría de permisos/RLS y reconciliación de migraciones.
5. Ejecutar E2E de Auth, comercio, afiliados, B2B, Social, Chat y soporte.
6. Ejecutar prueba LIVE real con Stream y replay.
7. Certificar Stripe test mode y preparar checklist de habilitación Live.
8. Completar observabilidad, backups, restauración, carga y respuesta a incidentes.
9. Aprobar jurisdicciones iniciales con revisión legal y fiscal.
10. Emitir acta Go/No-Go con evidencias y alcance geográfico exacto.

**Este documento es una matriz de trabajo y aceptación. No representa una certificación ya obtenida ni una autorización para habilitar pagos reales o anunciar disponibilidad mundial.**
