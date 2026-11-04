# Credi — Visión de producto y requisitos del ecosistema

## 1. Definición del producto

Credi es una **red social de comercio, comunidad y oportunidades profesionales**, con marketplace B2C y B2B, afiliación, mensajería instantánea, contenido multimedia, transmisiones LIVE y herramientas de negocio integradas.

No debe construirse como un simple marketplace con botones sociales ni como una colección de módulos aislados. La experiencia debe conectar identidad, contenido, relaciones, conversaciones, productos, empresas, oportunidades, pagos, reputación y soporte dentro de un mismo ecosistema.

Las plataformas existentes se consideran referencias de capacidades y patrones de uso, no plantillas para copiar sus marcas, interfaces protegidas o sistemas internos. Credi debe tener identidad, diseño, reglas y tecnología propias.

## 2. Pilares de producto

### 2.1 Red social y comunidades
Experiencia social inspirada en las fortalezas de las grandes redes generalistas:
- Perfiles personales, de creador, profesional, tienda y empresa, con controles de privacidad adecuados.
- Muro con publicaciones de texto, imágenes, galerías, vídeo, historias, reels y contenido de formato largo.
- Reacciones, comentarios, respuestas, menciones, compartir, guardar, seguir y reportar.
- Grupos y comunidades por intereses, sector, región, profesión o actividad, con roles, invitaciones, moderación y reglas.
- Páginas y presencia de organizaciones, eventos, actividades y calendario comunitario.
- Descubrimiento de personas, comunidades y contenido, sin exponer datos privados ni directorios no autorizados.

### 2.2 Creación visual y economía de creadores
Experiencia visual competitiva:
- Herramientas de publicación y edición para fotografía y vídeo, portada, subtítulos, recortes, borradores y programación opcional.
- Reels, historias, clips y emisiones con herramientas para creadores.
- Estadísticas de alcance, retención, interacción y conversiones cuando exista telemetría fiable.
- Colaboraciones, contenido de marca y vinculación transparente con productos y afiliación.
- Biblioteca y gestión de medios, con cargas resilientes, límites explícitos y estados de publicación reales.

### 2.3 Descubrimiento y personalización
El usuario debe poder descubrir contenido relevante y controlar qué ve:
- Preferencias explícitas por temas, intereses, idioma, formato y comunidades.
- Feed que combine señales de seguimiento, actualidad, relevancia e intereses declarados.
- Controles para indicar “ver más”, “ver menos”, dejar de seguir, silenciar y reiniciar preferencias.
- Transparencia sobre por qué se recomienda una publicación y opciones para desactivar o ajustar la personalización.
- Controles contra spam, manipulación, abuso de métricas y recomendaciones de contenido no autorizado.
- Modo de exploración cronológica o basada principalmente en cuentas seguidas, cuando sea posible.

La personalización no puede justificar el uso de datos para los que no exista base de autorización. Los datos sensibles no deben inferirse para perfilar o dirigir recomendaciones.

### 2.4 Mensajería instantánea y llamadas
Credi Chat debe ser un servicio de primera clase, no un panel auxiliar:
- Mensajes directos, conversaciones grupales y canales, sujetos a roles, invitaciones y políticas seguras de membresía.
- Entrega y sincronización en tiempo real, estados de envío/entrega/lectura y recuperación de conexión.
- Respuestas, menciones, reacciones, edición, eliminación, búsqueda, mensajes fijados y carpetas.
- Fotos, vídeo, documentos, audio, notas de voz y enlaces compartidos.
- Llamadas de voz y vídeo con permisos claros, calidad adaptable y recuperación de sesión.
- Notificaciones configurables, bloqueo, denuncia, controles de privacidad y protección antiabuso.
- Bots e integraciones mediante permisos y scopes explícitos, registro de actividad y límites de uso.
- Cifrado y afirmaciones de privacidad diferenciados por tipo de conversación; no anunciar cifrado de extremo a extremo para funciones que no lo implementen y validen.

La activación de grupos y canales requiere primero corregir la política de membresía insegura: no puede permitirse que un usuario se agregue arbitrariamente a conversaciones privadas.

### 2.5 LIVE y comercio en directo
Credi LIVE debe combinar creación audiovisual, interacción y operaciones comerciales:
- Studio para anfitrión, codificador externo y dispositivos compatibles.
- Protocolo de ingesta y reproducción seleccionable según soporte y condiciones de red.
- Chat en directo, espectadores, moderación, reacciones y herramientas del anfitrión.
- Catálogo de productos asociado a la sala, productos fijados, ofertas y enlaces comerciales.
- Métricas de audiencia y conversión basadas en eventos medidos.
- Recuperación de desconexiones, sincronización de estado, finalización correcta y replay reproducible.
- Herramientas de seguridad y moderación para emisiones y chat.

Criterio de aceptación de producción: codificador real → Cloudflare Stream → al menos dos espectadores autenticados → desconexión/reconexión → cierre → replay reproducible. La existencia de sala, claves o URLs no equivale a una transmisión verificada.

### 2.6 Marketplace B2C y B2B
Un comercio integrado, no dos catálogos desconectados:
- B2C: productos, tiendas, búsqueda, categorías, filtros, variantes, disponibilidad, carrito, checkout, pedidos, seguimiento, valoraciones y devoluciones según reglas.
- B2B: empresas, fabricantes, mayoristas, importadores, distribuidores, compras por volumen, catálogos empresariales, RFQ, cotizaciones, negociación, condiciones comerciales y pedidos.
- Catálogos con imágenes y vídeo, stock, precios, moneda, unidades, mínimos de compra, condiciones logísticas y políticas visibles.
- Perfiles de empresa y proveedores con verificación, reputación y datos de confianza apropiados.
- Comparación de ofertas, comunicación contextual y trazabilidad desde descubrimiento hasta entrega.
- Afiliación y atribución de conversiones, con reglas transparentes, libro de comisiones y liquidación auditables.
- Integración LIVE-to-commerce, social-to-commerce y chat-to-commerce, preservando el contexto de origen.

### 2.7 Red profesional, empleo y talento
Credi debe incorporar funciones de red profesional sin limitarse a un tablón de anuncios:
- Perfil profesional tipo currículum: experiencia, educación, habilidades, portafolio, certificaciones y disponibilidad, controlado por el usuario.
- Páginas de empresas, equipos, sectores, proyectos y actividad profesional.
- Publicación y búsqueda de empleos, prácticas, contratos, proyectos y servicios profesionales.
- Vacantes con requisitos estructurados, ubicación/remoto, modalidad, rango de compensación cuando proceda y fecha de cierre.
- Postulaciones, estados de candidatura, comunicación con reclutadores, entrevistas y seguimiento.
- Herramientas de reclutamiento para empresas, con roles y acceso limitado a la información de candidatos.
- Networking profesional, recomendaciones de habilidades y contenido especializado.
- Oportunidades locales, comunidades sectoriales y perfiles creativos enlazados a portafolios visuales.

Los datos de candidatos deben tener controles de consentimiento, visibilidad y retención. No se debe permitir que un reclutador vea información privada o sensible sin autorización.

### 2.8 Accesibilidad, gratuidad e inclusión
La accesibilidad gratuita es una característica estructural:
- Mantener una experiencia gratuita útil para crear perfil, participar, comunicarse y descubrir los servicios esenciales, sujeta a límites transparentes y sostenibles.
- Diferenciar claramente funciones gratuitas, límites razonables y servicios de pago opcionales, sin presentar cobros inesperados.
- Diseño adaptable para móvil, tableta y escritorio; buen rendimiento en conexiones lentas y dispositivos modestos.
- Accesibilidad por teclado, etiquetas comprensibles, contraste, foco visible, texto alternativo, subtítulos y compatibilidad con lectores de pantalla.
- Preferencias de idioma, formatos y notificaciones; mensajes de error que indiquen cómo resolver el problema.
- Cargas reanudables, compresión adecuada y estados de progreso claros cuando corresponda.

### 2.9 Privacidad, seguridad y confianza
- Un modelo de identidad común con permisos específicos por perfil, espacio, recurso y operación.
- RLS y comprobaciones de propiedad/membresía en el backend; ocultar controles en la interfaz nunca sustituye autorización.
- Invitaciones y roles para grupos, canales, empresas, equipos y administración.
- Bloqueo, denuncia, revisión, moderación, apelación y trazabilidad.
- Protección de sesiones, archivos, enlaces, datos personales, pagos y herramientas de agentes.
- Auditoría de cambios importantes, pagos, publicaciones, afiliación y acciones administrativas.
- Exportación y eliminación de datos de usuario conforme a las políticas aplicables y capacidades del producto.
- No afirmar cifrado, privacidad, verificación, entrega o finalización si el sistema no lo ha demostrado.

### 2.10 Credi Intelligence
La inteligencia debe coordinar servicios reales:
1. Interpretar una solicitud expresada en lenguaje natural.
2. Resolver la intención y determinar los módulos necesarios.
3. Consultar solo datos autorizados por la sesión y las políticas.
4. Elaborar un plan explícito de pasos, dependencias, riesgos y resultados esperados.
5. Solicitar aprobación separada para cada operación sensible.
6. Ejecutar con idempotencia, estados persistentes y límites de reintento.
7. Verificar el resultado consultando el estado persistido, no la respuesta del modelo.
8. Recuperar errores con compensaciones seguras o revisión humana y dejar auditoría.

La IA no puede inventar datos, permisos, inventario, precios, saldos, conversiones ni resultados; tampoco puede aprobar contenido, iniciar pagos irreversibles o enviar comunicaciones sensibles sin la autorización correspondiente.

## 3. Portales de servicio independientes, ecosistema compartido

Cada pilar debe tener su propio portal de nivel premium, con:
- Identidad visual y propósito claros.
- Panel de actividad e indicadores que procedan de datos reales.
- Espacio de trabajo específico para sus tareas principales.
- Búsqueda, filtros, estados y trazabilidad adecuados al servicio.
- Accesos a preferencias, privacidad, ayuda y soporte.
- Adaptación móvil, escritorio y accesibilidad.
- Conexiones contextuales con otros módulos sin duplicar identidades ni datos.

Los portales deben compartir navegación, identidad y componentes cuando convenga, pero no convertirse en una plantilla genérica que oculte la falta de profundidad funcional.

## 4. Principios de arquitectura

- Aplicación y experiencia web en Vercel.
- Identidad, datos, autorización y persistencia de negocio en Supabase.
- Cloudflare Stream como motor de vídeo LIVE cuando corresponda, integrado mediante adaptadores y webhooks verificables.
- Servicios externos como integraciones; el modelo de dominio, la identidad de usuarios, productos, comercios y relaciones siguen perteneciendo a Credi.
- Contratos tipados entre módulos; eventos auditables para operaciones que cruzan dominios.
- Ejecución idempotente y procesos recuperables para pagos, pedidos, mensajes, medios y operaciones de IA.
- Ninguna migración de producción o cambio de permisos se considera seguro solo porque el build compile.

## 5. Plan de evolución

### Fase A — Fundamentos y coherencia
- Estabilizar navegación, identidad, perfiles, permisos, rutas y diseño responsive.
- Auditar todas las rutas y acciones para detectar interfaces vacías, botones inertes, datos simulados y estados falsos.
- Consolidar patrones de carga, errores, notificaciones, accesibilidad y soporte.

### Fase B — Experiencia social y contenido
- Completar el muro, perfiles, seguidores, comunidades, grupos, eventos, publicaciones multimedia, historias y reels.
- Introducir controles de preferencias y personalización explicable.
- Medir publicación, entrega, visualización e interacción con eventos verificables.

### Fase C — Mensajería y LIVE
- Endurecer membresías, invitaciones y roles antes de habilitar grupos/canales.
- Validar mensajería multimedia, llamadas y recuperación con dos o más cuentas de prueba.
- Completar LIVE extremo a extremo y replay antes de declarar el servicio operativo.

### Fase D — Comercio y afiliación
- Completar recorridos B2C y B2B desde catálogo hasta pedido y seguimiento.
- Integrar RFQ, cotizaciones, comparación, negociación, chat contextual y reputación.
- Auditar atribución, comisiones, liquidación, pagos y devoluciones.

### Fase E — Profesiones y empleo
- Construir perfiles profesionales, empresas, vacantes, buscador, postulaciones y espacio de reclutamiento.
- Definir privacidad, consentimiento, estados de candidatura y controles anti-discriminación.

### Fase F — Intelligence y automatización
- Construir orquestador de intención, plan, grafo, aprobaciones por paso, ejecución durable, idempotencia, verificación y recuperación.
- Conectar solo capacidades reales y autorizadas de cada servicio.
- Validar flujos multi-módulo con escenarios de éxito, fallo parcial, reintentos y aislamiento entre usuarios.

## 6. Definición de terminado por servicio

Un portal no está terminado por tener una página atractiva o una colección de botones. Debe demostrar:
- Recorrido principal completo en móvil y escritorio.
- Persistencia y lectura de datos reales.
- Autorización backend y aislamiento entre usuarios.
- Estados de carga, vacío, error, éxito y recuperación.
- Notificaciones y auditoría cuando el dominio lo requiere.
- Pruebas unitarias, integración y E2E que ejecuten el flujo real.
- Accesibilidad básica y buen rendimiento.
- Métricas que procedan de eventos verificables.
- Documentación de límites, permisos y dependencias.
- Criterios específicos de producción cumplidos.

## 7. Indicadores del programa de calidad

El tablero de calidad debe informar por servicio:
- Cobertura de recorridos críticos aprobados / definidos.
- Porcentaje de pruebas E2E ejecutadas frente a omitidas.
- Defectos críticos abiertos y antigüedad.
- Acciones rechazadas correctamente por permisos.
- Operaciones completadas y verificadas, separadas de las propuestas.
- Tasa de fallos, reintentos y recuperaciones.
- Rendimiento de publicación, chat, reproducción y búsqueda.
- Cumplimiento de accesibilidad y errores de interfaz.

No se debe resumir la calidad de todo Credi en un único build verde: las evidencias deben mostrarse por servicio y por recorrido.

## 8. Regla de comunicación del estado

Utilizar estados explícitos:
- **Implementado:** código conectado al flujo, no solo UI.
- **Validado:** prueba real del escenario y evidencia disponible.
- **Parcial:** existe funcionalidad, pero faltan recorridos o controles importantes.
- **Pendiente:** no está implementado o depende de una capacidad aún no construida.
- **Bloqueado:** existe un impedimento conocido y documentado.

No describir como listo un módulo solo porque la ruta exista, porque una API responda o porque CI haya pasado con pruebas E2E omitidas.
