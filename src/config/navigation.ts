export interface NavigationItem {
  label: string;
  href: string;
  requiresAuth?: boolean;
  roles?: readonly string[];
}

export const PUBLIC_NAVIGATION = [
  {
    label: "Inicio",
    href: "/",
  },
  {
    label: "Marketplace",
    href: "/marketplace",
  },
  {
    label: "Productos",
    href: "/products",
  },
  {
    label: "Servicios",
    href: "/services",
  },
  {
    label: "Vendedores",
    href: "/sellers",
  },
  {
    label: "Buscar",
    href: "/search",
  },
] as const satisfies readonly NavigationItem[];

export const USER_NAVIGATION = [
  {
    label: "Dashboard",
    href: "/dashboard",
    requiresAuth: true,
  },
  {
    label: "Pedidos",
    href: "/orders",
    requiresAuth: true,
  },
  {
    label: "Perfil",
    href: "/dashboard/profile",
    requiresAuth: true,
  },
  {
    label: "Configuración",
    href: "/dashboard/settings",
    requiresAuth: true,
  },
] as const satisfies readonly NavigationItem[];

export const ADMIN_NAVIGATION = [
  {
    label: "Administración",
    href: "/admin",
    requiresAuth: true,
    roles: ["admin"],
  },
] as const satisfies readonly NavigationItem[];
