import type { UserRole } from "@/types/user";

export type PortalDomain = {
  key: string;
  label: string;
  href: string;
  description: string;
  group: "primary" | "capability";
  /** Whether the destination requires an authenticated Credi session. */
  requiresAuth?: boolean;
  /** Canonical public.profiles.role values allowed to see this destination. */
  roles?: readonly UserRole[];
};

/**
 * Canonical first-party destination registry.
 *
 * This registry describes navigation metadata only. It is not an authorization
 * boundary: protected pages, Route Handlers and Supabase RLS must enforce access.
 */
export const PORTAL_DOMAINS: readonly PortalDomain[] = [
  { key: "home", label: "Inicio", href: "/", description: "Centro de entrada y actividad de Credi.", group: "primary" },
  { key: "wall", label: "Muro", href: "/social", description: "Comunidad, historias, reels y publicaciones.", group: "primary" },
  { key: "marketplace", label: "Marketplace", href: "/marketplace", description: "Descubre productos, tiendas, ofertas y oportunidades comerciales.", group: "primary" },
  { key: "sell", label: "Vender", href: "/publish", description: "Publica productos, servicios, catálogos y ofertas comerciales.", group: "primary", requiresAuth: true },
  { key: "b2b", label: "B2B", href: "/b2b", description: "Compras empresariales, proveedores, mayoristas, cotizaciones y negociación.", group: "primary" },
  { key: "services", label: "Servicios", href: "/services", description: "Servicios profesionales y capacidades comerciales.", group: "primary" },
  { key: "free", label: "Free", href: "/free", description: "Acceso gratuito al mismo ecosistema Credi.", group: "primary" },

  { key: "chat", label: "Chat", href: "/chat", description: "Mensajería y comunicación comercial.", group: "capability", requiresAuth: true },
  { key: "live", label: "LIVE", href: "/live", description: "Live Commerce, eventos y transmisiones.", group: "capability" },
  { key: "marketing", label: "Marketing", href: "/marketing", description: "Campañas, audiencias, creatividades y analítica publicitaria.", group: "capability", requiresAuth: true },
  { key: "content", label: "Contenido", href: "/publish", description: "Publicaciones, historias, reels y publicidad.", group: "capability", requiresAuth: true },
  { key: "analytics", label: "Analytics", href: "/analytics", description: "Métricas y rendimiento de Credi.", group: "capability", requiresAuth: true },
  { key: "video_catalog", label: "Catálogo Video", href: "/catalogo-video", description: "Catálogo comercial enriquecido con vídeo.", group: "capability" },
  { key: "stories", label: "Historias", href: "/historias", description: "Contenido efímero y descubrimiento.", group: "capability" },
  { key: "videos", label: "Vídeos", href: "/videos", description: "Vídeos y contenido audiovisual de la comunidad.", group: "capability" },
  { key: "verified_suppliers", label: "Proveedores verificados", href: "/proveedores-verificados", description: "Directorio de proveedores y empresas verificadas.", group: "capability" },
  { key: "b2b_operations", label: "B2B Operaciones", href: "/dashboard/b2b", description: "Gestión empresarial, catálogos y publicación B2B.", group: "capability", requiresAuth: true },
  { key: "affiliate", label: "Afiliados", href: "/affiliate", description: "Afiliación, enlaces y comisiones.", group: "capability" },
  { key: "affiliate_dashboard", label: "Centro de afiliados", href: "/dashboard/affiliate", description: "Rendimiento, referencias y comisiones del afiliado.", group: "capability", requiresAuth: true },
  { key: "affiliate_links", label: "Enlaces de afiliado", href: "/dashboard/affiliate/links", description: "Gestión de enlaces y atribución de productos.", group: "capability", requiresAuth: true },
  { key: "wallet", label: "Wallet", href: "/wallet", description: "Operaciones y saldos financieros.", group: "capability", requiresAuth: true },
  { key: "business", label: "Business", href: "/business-os", description: "Herramientas de gestión empresarial.", group: "capability", requiresAuth: true },
  { key: "intelligence", label: "Intelligence", href: "/intelligence", description: "Capacidades inteligentes de Credi.", group: "capability", requiresAuth: true },
  { key: "commerce_studio", label: "Commerce Studio", href: "/commerce-studio", description: "Operación comercial, catálogo y gestión del negocio.", group: "capability" },
  { key: "inventory", label: "Inventario", href: "/inventario", description: "Stock, reservas y movimientos comerciales.", group: "capability", requiresAuth: true },
  { key: "negotiations", label: "Negociaciones", href: "/negociaciones", description: "Cotizaciones, acuerdos y negociación comercial.", group: "capability", requiresAuth: true },
  { key: "payments", label: "Pagos", href: "/pagos", description: "Pagos, cobros y conciliación operativa.", group: "capability", requiresAuth: true },
  { key: "escrow", label: "Escrow", href: "/escrow", description: "Custodia, liberación y protección de operaciones.", group: "capability", requiresAuth: true },
  { key: "security", label: "Seguridad", href: "/security", description: "Seguridad, sesiones y controles.", group: "capability", requiresAuth: true },

  { key: "dashboard", label: "Dashboard", href: "/dashboard", description: "Panel personal y actividad de la cuenta.", group: "capability", requiresAuth: true },
  { key: "dashboard_orders", label: "Pedidos", href: "/dashboard/orders", description: "Pedidos y seguimiento de operaciones.", group: "capability", requiresAuth: true },
  { key: "dashboard_profile", label: "Perfil", href: "/dashboard/profile", description: "Datos y preferencias del perfil.", group: "capability", requiresAuth: true },
  { key: "dashboard_settings", label: "Configuración", href: "/dashboard/settings", description: "Preferencias y configuración de la cuenta.", group: "capability", requiresAuth: true },
  { key: "seller_dashboard", label: "Panel de vendedor", href: "/dashboard/seller", description: "Productos, tienda y actividad del vendedor.", group: "capability", requiresAuth: true, roles: ["vendor", "admin"] },
  { key: "admin", label: "Administración", href: "/admin", description: "Administración y gobierno de la plataforma.", group: "capability", requiresAuth: true, roles: ["admin"] },
  { key: "admin_compliance", label: "Cumplimiento", href: "/admin/compliance", description: "Herramientas administrativas de cumplimiento.", group: "capability", requiresAuth: true, roles: ["admin"] },

  { key: "search", label: "Buscar", href: "/search", description: "Buscar productos, servicios y publicaciones.", group: "capability" },
  { key: "login", label: "Iniciar sesión", href: "/login", description: "Acceso a una cuenta Credi.", group: "capability" },
  { key: "register", label: "Crear cuenta", href: "/register", description: "Registro en el ecosistema Credi.", group: "capability" },
] as const;

export const PRIMARY_DOMAINS = PORTAL_DOMAINS.filter((domain) => domain.group === "primary");
export const CAPABILITY_DOMAINS = PORTAL_DOMAINS.filter((domain) => domain.group === "capability");
