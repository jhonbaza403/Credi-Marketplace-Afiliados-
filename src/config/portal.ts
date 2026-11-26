import type { UserRole } from "@/types/user";

export type PortalPillarKey = "social" | "messaging" | "commerce" | "supply";

export type PortalPillar = {
  key: PortalPillarKey;
  title: string;
  description: string;
  order: number;
};

export const PORTAL_PILLARS: readonly PortalPillar[] = [
  {
    key: "social",
    title: "Social, comunidad y video",
    description: "Perfiles personales y de creador, feed, historias, video y Credi LIVE.",
    order: 1,
  },
  {
    key: "messaging",
    title: "Mensajería y automatización",
    description: "Chat, llamadas, canales de difusión, apps y automatizaciones gobernadas.",
    order: 2,
  },
  {
    key: "commerce",
    title: "Marketplace y social commerce",
    description: "Catálogo, publicaciones, pedidos, pagos y reputación.",
    order: 3,
  },
  {
    key: "supply",
    title: "Abastecimiento B2B y dropshipping",
    description: "Proveedores, mayoristas, RFQ, cotizaciones y abastecimiento.",
    order: 4,
  },
] as const;

export type PortalDomain = {
  key: string;
  label: string;
  href: string;
  description: string;
  group: "primary" | "capability";
  pillar?: PortalPillarKey;
  /** Whether the destination requires an authenticated Credi session. */
  requiresAuth?: boolean;
  /** Canonical public.profiles.role values allowed to see this destination. */
  roles?: readonly UserRole[];
};

/**
 * Canonical first-party destination registry.
 *
 * The pillar is product taxonomy, not an authorization boundary. Protected
 * pages, Route Handlers and Supabase RLS must continue enforcing access.
 * Only routes backed by an implemented page and server contract are listed here.
 * Pillar metadata never replaces route authorization or Supabase RLS.
 */
export const PORTAL_DOMAINS: readonly PortalDomain[] = [
  // Pillar 1 — Social, community and video
  { key: "home", label: "Inicio", href: "/", description: "Centro de entrada y actividad de Credi.", group: "primary", pillar: "social" },
  { key: "wall", label: "Muro", href: "/social", description: "Comunidad, historias, reels y publicaciones.", group: "primary", pillar: "social" },
  { key: "live", label: "LIVE", href: "/live", description: "Comercio en vivo, transmisiones, chat y productos vinculados.", group: "primary", pillar: "social" },
  { key: "stories", label: "Historias", href: "/historias", description: "Contenido efímero y descubrimiento.", group: "capability", pillar: "social" },
  { key: "videos", label: "Vídeos", href: "/videos", description: "Vídeos verticales y contenido audiovisual de la comunidad.", group: "capability", pillar: "social" },
  { key: "video_catalog", label: "Catálogo Video", href: "/catalogo-video", description: "Catálogo comercial enriquecido con vídeo.", group: "capability", pillar: "social" },
  { key: "creators", label: "Creadores", href: "/creadores", description: "Perfiles públicos de creador conectados a la identidad Credi.", group: "capability", pillar: "social" },
  { key: "free", label: "Free", href: "/free", description: "Acceso gratuito al mismo ecosistema Credi.", group: "primary", pillar: "social" },
  { key: "dashboard_profile", label: "Perfil", href: "/dashboard/profile", description: "Perfil y preferencias de la cuenta.", group: "capability", pillar: "social", requiresAuth: true },
  { key: "dashboard_settings", label: "Configuración", href: "/dashboard/settings", description: "Preferencias y configuración de la cuenta.", group: "capability", pillar: "social", requiresAuth: true },

  // Pillar 2 — Messaging and automation
  { key: "chat", label: "Chat", href: "/chat", description: "Mensajería comercial, contactos, llamadas y asistencia.", group: "capability", pillar: "messaging", requiresAuth: true },
  { key: "channels", label: "Canales", href: "/canales", description: "Canales de difusión públicos, no listados y privados por invitación.", group: "capability", pillar: "messaging" },
  { key: "apps", label: "Mini-Apps", href: "/apps", description: "Catálogo de extensiones y aplicaciones de Credi.", group: "capability", pillar: "messaging" },
  { key: "automation", label: "Automatización", href: "/automation", description: "Reglas y ejecuciones automatizadas con auditoría.", group: "capability", pillar: "messaging", requiresAuth: true },
  { key: "developer", label: "Developer Platform", href: "/developer", description: "Aplicaciones, scopes, claves API y capacidades para integradores.", group: "capability", pillar: "messaging", requiresAuth: true },

  // Pillar 3 — Marketplace and social commerce
  { key: "marketplace", label: "Marketplace", href: "/marketplace", description: "Descubre productos, tiendas, ofertas y oportunidades comerciales.", group: "primary", pillar: "commerce" },
  { key: "sell", label: "Vender", href: "/publish", description: "Publica productos, servicios, catálogos y ofertas comerciales.", group: "primary", pillar: "commerce", requiresAuth: true },
  { key: "services", label: "Servicios", href: "/services", description: "Servicios profesionales y capacidades comerciales.", group: "primary", pillar: "commerce" },
  { key: "content", label: "Contenido", href: "/publish", description: "Publicaciones comerciales, historias y contenido de producto.", group: "capability", pillar: "commerce", requiresAuth: true },
  { key: "marketing", label: "Marketing", href: "/marketing", description: "Campañas, audiencias, creatividades y analítica publicitaria.", group: "capability", pillar: "commerce", requiresAuth: true },
  { key: "analytics", label: "Analytics", href: "/analytics", description: "Métricas y rendimiento comercial de Credi.", group: "capability", pillar: "commerce", requiresAuth: true },
  { key: "affiliate", label: "Afiliados", href: "/affiliate", description: "Afiliación, enlaces y comisiones.", group: "capability", pillar: "commerce" },
  { key: "affiliate_dashboard", label: "Centro de afiliados", href: "/dashboard/affiliate", description: "Rendimiento, referencias y comisiones del afiliado.", group: "capability", pillar: "commerce", requiresAuth: true },
  { key: "affiliate_links", label: "Enlaces de afiliado", href: "/dashboard/affiliate/links", description: "Gestión de enlaces y atribución de productos.", group: "capability", pillar: "commerce", requiresAuth: true },
  { key: "wallet", label: "Wallet", href: "/wallet", description: "Operaciones y saldos financieros internos.", group: "capability", pillar: "commerce", requiresAuth: true },
  { key: "payments", label: "Pagos", href: "/pagos", description: "Pagos, cobros y conciliación operativa.", group: "capability", pillar: "commerce", requiresAuth: true },
  { key: "escrow", label: "Escrow", href: "/escrow", description: "Expedientes de custodia y seguimiento de condiciones.", group: "capability", pillar: "commerce", requiresAuth: true },
  { key: "inventory", label: "Inventario", href: "/inventario", description: "Stock, reservas y movimientos comerciales.", group: "capability", pillar: "commerce", requiresAuth: true },
  { key: "negotiations", label: "Negociaciones", href: "/negociaciones", description: "Cotizaciones, acuerdos y negociación comercial.", group: "capability", pillar: "commerce", requiresAuth: true },
  { key: "business", label: "Business", href: "/business-os", description: "Herramientas de gestión empresarial.", group: "capability", pillar: "commerce", requiresAuth: true },
  { key: "intelligence", label: "Intelligence", href: "/intelligence", description: "Capacidades inteligentes y analítica de Credi.", group: "capability", pillar: "commerce", requiresAuth: true },
  { key: "commerce_studio", label: "Commerce Studio", href: "/commerce-studio", description: "Operación comercial, catálogo y gestión del negocio.", group: "capability", pillar: "commerce" },
  { key: "dashboard", label: "Dashboard", href: "/dashboard", description: "Panel personal y actividad de la cuenta.", group: "capability", pillar: "commerce", requiresAuth: true },
  { key: "dashboard_orders", label: "Pedidos", href: "/dashboard/orders", description: "Pedidos y seguimiento de operaciones.", group: "capability", pillar: "commerce", requiresAuth: true },
  { key: "seller_dashboard", label: "Panel de vendedor", href: "/dashboard/seller", description: "Productos, tienda y actividad del vendedor.", group: "capability", pillar: "commerce", requiresAuth: true, roles: ["vendor", "admin"] },
  { key: "security", label: "Seguridad", href: "/security", description: "Seguridad, sesiones y controles de la cuenta.", group: "capability", pillar: "commerce", requiresAuth: true },

  // Pillar 4 — B2B supply and wholesale
  { key: "b2b", label: "B2B", href: "/b2b", description: "Compras empresariales, proveedores, mayoristas y cotizaciones.", group: "primary", pillar: "supply" },
  { key: "b2b_operations", label: "B2B Operaciones", href: "/dashboard/b2b", description: "Gestión empresarial, catálogos y publicación B2B.", group: "capability", pillar: "supply", requiresAuth: true },
  { key: "procurement", label: "Abastecimiento", href: "/abastecimiento", description: "Solicitudes de compra y gestión de cotizaciones RFQ.", group: "capability", pillar: "supply", requiresAuth: true },
  { key: "wholesale", label: "Compras mayoristas", href: "/compras-mayoristas", description: "Descubrimiento y gestión de oportunidades al mayor.", group: "capability", pillar: "supply" },
  { key: "verified_suppliers", label: "Proveedores verificados", href: "/proveedores-verificados", description: "Directorio de proveedores y empresas con señales de verificación.", group: "capability", pillar: "supply" },

  // Cross-cutting and account entry points
  { key: "search", label: "Buscar", href: "/search", description: "Buscar productos, servicios y publicaciones.", group: "capability" },
  { key: "login", label: "Iniciar sesión", href: "/login", description: "Acceso a una cuenta Credi.", group: "capability" },
  { key: "register", label: "Crear cuenta", href: "/register", description: "Registro en el ecosistema Credi.", group: "capability" },
  { key: "admin", label: "Administración", href: "/admin", description: "Administración y gobierno de la plataforma.", group: "capability", requiresAuth: true, roles: ["admin"] },
  { key: "admin_compliance", label: "Cumplimiento", href: "/admin/compliance", description: "Herramientas administrativas de cumplimiento.", group: "capability", requiresAuth: true, roles: ["admin"] },
] as const;

export const PRIMARY_DOMAINS = PORTAL_DOMAINS.filter((domain) => domain.group === "primary");
export const CAPABILITY_DOMAINS = PORTAL_DOMAINS.filter((domain) => domain.group === "capability");
