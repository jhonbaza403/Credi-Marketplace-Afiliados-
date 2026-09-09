export interface NavigationItem {
  label: string;
  href: string;
  requiresAuth?: boolean;
  roles?: readonly string[];
}

/**
 * Canonical internal routes only.
 * External affiliate destinations are intentionally kept outside navigation.
 */
export const PUBLIC_NAVIGATION = [
  { label: "Inicio", href: "/" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Productos", href: "/products" },
  { label: "Servicios", href: "/services" },
  { label: "B2B", href: "/b2b" },
  { label: "Vendedores", href: "/sellers" },
  { label: "Buscar", href: "/search" },
] as const satisfies readonly NavigationItem[];

export const USER_NAVIGATION = [
  { label: "Dashboard", href: "/dashboard", requiresAuth: true },
  { label: "Pedidos", href: "/orders", requiresAuth: true },
  { label: "Perfil", href: "/dashboard/profile", requiresAuth: true },
  { label: "Configuración", href: "/dashboard/settings", requiresAuth: true },
] as const satisfies readonly NavigationItem[];

export const AFFILIATE_NAVIGATION = [
  { label: "Programa de afiliados", href: "/affiliate" },
  { label: "Centro de afiliados", href: "/dashboard/affiliate", requiresAuth: true },
  { label: "Enlaces por producto", href: "/dashboard/affiliate/links", requiresAuth: true },
] as const satisfies readonly NavigationItem[];

export const SELLER_NAVIGATION = [
  { label: "Panel de vendedor", href: "/dashboard/seller", requiresAuth: true, roles: ["seller"] },
  { label: "Publicar producto", href: "/publish", requiresAuth: true, roles: ["seller"] },
  { label: "Publicar B2B", href: "/b2b/publish", requiresAuth: true, roles: ["seller"] },
] as const satisfies readonly NavigationItem[];

export const ADMIN_NAVIGATION = [
  { label: "Administración", href: "/admin", requiresAuth: true, roles: ["admin"] },
  { label: "Cumplimiento", href: "/admin/compliance", requiresAuth: true, roles: ["admin"] },
] as const satisfies readonly NavigationItem[];
