# Matriz de cumplimiento por jurisdicción — Credi Marketplace

Última revisión técnica: 2026-09-09.

> Este documento es un inventario de ingeniería y cumplimiento. No constituye asesoramiento jurídico. Antes de operar comercialmente en una jurisdicción deben validarse entidad responsable, licencias, impuestos, productos regulados, términos locales, autoridades y requisitos sectoriales.

## Línea base global

La plataforma debe aplicar como mínimo:

- minimización de datos y limitación de finalidad;
- autenticación fuerte y autorización por usuario/rol;
- RLS para datos privados;
- información clara del precio total y del vendedor;
- control de consentimiento/preferencias de marketing y cookies cuando corresponda;
- divulgación de publicidad, patrocinios y relaciones de afiliación;
- controles de fraude y abuso;
- gestión de reclamaciones, devoluciones y estados de pedido;
- control de transferencias internacionales de datos;
- retención y eliminación de datos conforme a la finalidad y obligación legal;
- bloqueo de categorías o destinos cuando un producto requiera autorización, licencia o esté prohibido.

## Unión Europea / EEE

Marco técnico: GDPR + normas de consumo + obligaciones de marketplace aplicables.

Controles: derechos de acceso/rectificación/eliminación/oposición/portabilidad cuando correspondan; base jurídica por finalidad; consentimiento para tecnologías no esenciales; información precontractual; identidad/condición del vendedor; transparencia de marketplace; desistimiento cuando corresponda; restricciones de entrega y medios de pago.

Fuentes oficiales:
- Reglamento GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Consumer Rights Directive: https://commission.europa.eu/law/law-topic/consumer-protection-law/consumer-contract-law/consumer-rights-directive_en
- Modernisation Directive / marketplace transparency: https://eur-lex.europa.eu/eli/dir/2019/2161/oj

## Estados Unidos — California

Marco técnico: CCPA/CPRA, más legislación federal/estatal y sectorial.

Controles: acceso, conocimiento, eliminación y opt-out de venta/compartición cuando sean aplicables; respeto de Global Privacy Control cuando corresponda; no discriminación por ejercer derechos; inventario de publicidad y compartición.

Fuente oficial: https://www.oag.ca.gov/privacy/ccpa

## Estados Unidos — federal

Controles: publicidad veraz, prevención de prácticas engañosas, divulgación clara de relaciones de afiliación/patrocinio, controles para reseñas auténticas y recopilación/gestión de información de vendedores cuando una norma aplicable lo requiera.

Fuente oficial FTC: https://www.ftc.gov/business-guidance/advertising-marketing/online-advertising-marketing

## Brasil

Marco técnico: LGPD + normativa ANPD + consumidor.

Controles: finalidad y base legal, derechos del titular, seguridad, minimización, canal de solicitudes, transferencias internacionales con mecanismo válido y documentación de salvaguardas.

Fuentes oficiales:
- ANPD — LGPD: https://www.gov.br/anpd/
- Transferencia internacional: https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados

## Colombia

Marco técnico: Ley 1581 y régimen de protección al consumidor, incluida la regulación de comercio electrónico.

Controles: autorización y tratamiento de datos, privacidad, identificación/información del proveedor, prueba de aceptación, condiciones de comercio electrónico y reclamaciones.

Fuente oficial: https://www1.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306

## México

Marco técnico: Ley Federal de Protección de Datos Personales en Posesión de los Particulares y protección al consumidor.

Controles: aviso de privacidad, finalidades, derechos ARCO, seguridad, transferencias y comunicaciones comerciales conforme a la normativa vigente.

Fuente oficial: https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf

## Argentina

Marco técnico: Ley 25.326 y normas de consumidor/marketing aplicables.

Controles: derechos de acceso, rectificación y supresión; tratamiento de datos para publicidad con base jurídica adecuada; preferencias de marketing y canal de ejercicio de derechos.

Fuente oficial: https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion

## Chile

Aplicar la normativa de protección de datos y consumidor vigente, incluyendo sus regímenes transitorios y sectoriales. El código de jurisdicción existe en `src/config/jurisdictions.ts` para permitir una actualización futura sin modificar la arquitectura.

## Canadá

Marco técnico: PIPEDA y legislación provincial cuando corresponda; CASL para marketing electrónico.

Controles: accountability, finalidad, consentimiento, limitación de datos, salvaguardas, acceso y mecanismo de opt-out/consentimiento para marketing.

Fuentes oficiales:
- PIPEDA: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/
- E-marketing/CASL: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/r_o_p/canadas-anti-spam-legislation/casl_compliance_help/

## Australia

Aplicar Privacy Act y Australian Consumer Law cuando corresponda, más normas estatales y sectoriales.

## Venezuela

Aplicar las normas de protección de datos, consumidor, comercio electrónico, tributación, productos regulados y demás legislación sectorial que corresponda. La configuración técnica incluye Venezuela como jurisdicción para permitir reglas específicas, pero exige revisión jurídica local antes de activar operaciones comerciales.

## Regla técnica de implementación

No se debe hardcodear una única política para todos los países. El país/jurisdicción debe determinar, como mínimo:

1. qué aviso de privacidad mostrar;
2. si una cookie/SDK requiere consentimiento;
3. qué derechos y canales ofrecer;
4. qué información del vendedor es pública;
5. qué información debe mostrarse antes del pago;
6. qué reglas de devolución/retracto se aplican;
7. qué mecanismo de transferencia internacional utilizar;
8. qué productos o servicios están restringidos;
9. qué textos contractuales y fiscales deben aplicarse.

La matriz técnica está implementada en `src/config/jurisdictions.ts` y el Centro Legal está disponible en `/legal`.
