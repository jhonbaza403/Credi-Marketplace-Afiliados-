export type PortalDomain = {
  key: string
  label: string
  href: string
  description: string
  group: "primary" | "capability"
}

export const PORTAL_DOMAINS: readonly PortalDomain[] = [
  { key: "home", label: "Inicio", href: "/", description: "Centro de entrada y actividad de Credi.", group: "primary" },
  { key: "wall", label: "Muro", href: "/social", description: "Comunidad, historias, reels y publicaciones.", group: "primary" },
  { key: "marketplace", label: "Marketplace", href: "/marketplace", description: "Productos, tiendas y comercio.", group: "primary" },
  { key: "services", label: "Servicios", href: "/services", description: "Servicios profesionales y capacidades comerciales.", group: "primary" },
  { key: "free", label: "Free", href: "/free", description: "Acceso gratuito al mismo ecosistema Credi.", group: "primary" },
  { key: "chat", label: "Chat", href: "/chat", description: "Mensajería y comunicación comercial.", group: "capability" },
  { key: "live", label: "LIVE", href: "/live", description: "Live Commerce, eventos y transmisiones.", group: "capability" },
  { key: "marketing", label: "Marketing", href: "/marketing", description: "Campañas, audiencias, creatividades y analítica publicitaria.", group: "capability" },
  { key: "content", label: "Contenido", href: "/publish", description: "Publicaciones, historias, reels y publicidad.", group: "capability" },
  { key: "analytics", label: "Analytics", href: "/analytics", description: "Métricas y rendimiento de Credi.", group: "capability" },
  { key: "video_catalog", label: "Catálogo Video", href: "/catalogo-video", description: "Catálogo comercial enriquecido con vídeo.", group: "capability" },
  { key: "stories", label: "Historias", href: "/historias", description: "Contenido efímero y descubrimiento.", group: "capability" },
  { key: "b2b", label: "B2B", href: "/b2b", description: "Operaciones y relaciones empresariales.", group: "capability" },
  { key: "affiliate", label: "Afiliados", href: "/affiliate", description: "Afiliación, enlaces y comisiones.", group: "capability" },
  { key: "wallet", label: "Wallet", href: "/wallet", description: "Operaciones y saldos financieros.", group: "capability" },
  { key: "business", label: "Business", href: "/business-os", description: "Herramientas de gestión empresarial.", group: "capability" },
  { key: "intelligence", label: "Intelligence", href: "/intelligence", description: "Capacidades inteligentes de Credi.", group: "capability" },
  { key: "security", label: "Seguridad", href: "/security", description: "Seguridad, sesiones y controles.", group: "capability" },
] as const

export const PRIMARY_DOMAINS = PORTAL_DOMAINS.filter((domain) => domain.group === "primary")
export const CAPABILITY_DOMAINS = PORTAL_DOMAINS.filter((domain) => domain.group === "capability")
