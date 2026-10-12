export type PortalDomain = {
  key: string
  label: string
  href: string
  description: string
  group: "primary" | "capability"
  requiresAuth?: boolean
  roles?: readonly string[]
}

export const PORTAL_DOMAINS: readonly PortalDomain[] = [
  { key: "home", label: "Inicio", href: "/", description: "Centro de entrada y actividad de Credi.", group: "primary" },
  { key: "search", label: "Buscar", href: "/search", description: "Buscar en Credi.", group: "capability" },
  { key: "login", label: "Entrar", href: "/login", description: "Accede a tu cuenta.", group: "capability" },
  { key: "register", label: "Crear cuenta", href: "/register", description: "Crea tu cuenta Credi.", group: "capability" },
  { key: "wall", label: "Muro", href: "/social", description: "Comunidad, historias, reels y publicaciones.", group: "primary" },
  { key: "marketplace", label: "Marketplace", href: "/marketplace", description: "Descubre productos, tiendas, ofertas y oportunidades comerciales.", group: "primary" },
  { key: "sell", label: "Vender", href: "/publish", description: "Publica productos, servicios, catálogos y ofertas comerciales.", group: "primary" },
  { key: "b2b", label: "B2B", href: "/b2b", description: "Compras empresariales, proveedores, mayoristas, cotizaciones y negociación.", group: "primary" },
  { key: "services", label: "Servicios", href: "/services", description: "Servicios profesionales y capacidades comerciales.", group: "primary" },
  { key: "free", label: "Free", href: "/free", description: "Acceso gratuito al mismo ecosistema Credi.", group: "primary" },
  { key: "chat", label: "Chat", href: "/chat", description: "Mensajería y comunicación comercial.", group: "capability" },
  { key: "live", label: "LIVE", href: "/live", description: "Live Commerce, eventos y transmisiones.", group: "capability" },
  { key: "marketing", label: "Marketing", href: "/marketing", description: "Campañas, audiencias, creatividades y analítica publicitaria.", group: "capability" },
  { key: "content", label: "Contenido", href: "/publish", description: "Publicaciones, historias, reels y publicidad.", group: "capability" },
  { key: "analytics", label: "Analytics", href: "/analytics", description: "Métricas y rendimiento de Credi.", group: "capability" },
  { key: "video_catalog", label: "Catálogo Video", href: "/catalogo-video", description: "Catálogo comercial enriquecido con vídeo.", group: "capability" },
  { key: "stories", label: "Historias", href: "/historias", description: "Contenido efímero y descubrimiento.", group: "capability" },
  { key: "videos", label: "Vídeos", href: "/videos", description: "Vídeos y contenido audiovisual.", group: "capability" },
  { key: "verified_suppliers", label: "Proveedores verificados", href: "/proveedores-verificados", description: "Descubre proveedores verificados.", group: "capability" },
  { key: "b2b_ops", label: "B2B Operaciones", href: "/dashboard/b2b", description: "Gestión empresarial, catálogos y publicación B2B.", group: "capability", requiresAuth: true },
  { key: "affiliate", label: "Afiliados", href: "/affiliate", description: "Afiliación, enlaces y comisiones.", group: "capability" },
  { key: "wallet", label: "Wallet", href: "/wallet", description: "Operaciones y saldos financieros.", group: "capability", requiresAuth: true },
  { key: "business", label: "Business", href: "/business-os", description: "Herramientas de gestión empresarial.", group: "capability", requiresAuth: true },
  { key: "intelligence", label: "Intelligence", href: "/intelligence", description: "Capacidades inteligentes de Credi.", group: "capability" },
  { key: "commerce_studio", label: "Commerce Studio", href: "/commerce-studio", description: "Operación comercial, catálogo y gestión del negocio.", group: "capability", requiresAuth: true },
  { key: "inventory", label: "Inventario", href: "/inventario", description: "Stock, reservas y movimientos comerciales.", group: "capability", requiresAuth: true },
  { key: "negotiations", label: "Negociaciones", href: "/negociaciones", description: "Cotizaciones, acuerdos y negociación comercial.", group: "capability", requiresAuth: true },
  { key: "payments", label: "Pagos", href: "/pagos", description: "Pagos, cobros y conciliación operativa.", group: "capability", requiresAuth: true },
  { key: "escrow", label: "Escrow", href: "/escrow", description: "Custodia, liberación y protección de operaciones.", group: "capability" },
  { key: "security", label: "Seguridad", href: "/security", description: "Seguridad, sesiones y controles.", group: "capability", requiresAuth: true },
  { key: "dashboard", label: "Dashboard", href: "/dashboard", description: "Panel personal.", group: "capability", requiresAuth: true },
  { key: "orders", label: "Pedidos", href: "/orders", description: "Consulta tus pedidos.", group: "capability", requiresAuth: true },
  { key: "profile", label: "Perfil", href: "/dashboard/profile", description: "Tu perfil.", group: "capability", requiresAuth: true },
  { key: "settings", label: "Configuración", href: "/dashboard/settings", description: "Preferencias de cuenta.", group: "capability", requiresAuth: true },
  { key: "affiliate_dashboard", label: "Centro de afiliados", href: "/dashboard/affiliate", description: "Administra tu afiliación.", group: "capability", requiresAuth: true },
  { key: "affiliate_links", label: "Enlaces por producto", href: "/dashboard/affiliate/links", description: "Gestiona enlaces de afiliación.", group: "capability", requiresAuth: true },
  { key: "seller_dashboard", label: "Panel de vendedor", href: "/dashboard/seller", description: "Gestiona tu tienda.", group: "capability", requiresAuth: true, roles: ["seller"] },
  { key: "create_product", label: "Publicar producto", href: "/products/create", description: "Crea un producto.", group: "capability", requiresAuth: true, roles: ["seller"] },
  { key: "publish_b2b", label: "Publicar B2B", href: "/b2b/publish", description: "Publica una oferta B2B.", group: "capability", requiresAuth: true, roles: ["seller"] },
  { key: "admin", label: "Administración", href: "/admin", description: "Administra la plataforma.", group: "capability", requiresAuth: true, roles: ["admin"] },
  { key: "admin_compliance", label: "Cumplimiento", href: "/admin/compliance", description: "Controles de cumplimiento.", group: "capability", requiresAuth: true, roles: ["admin"] },
] as const

export const PRIMARY_DOMAINS = PORTAL_DOMAINS.filter((domain) => domain.group === "primary")
export const CAPABILITY_DOMAINS = PORTAL_DOMAINS.filter((domain) => domain.group === "capability")
