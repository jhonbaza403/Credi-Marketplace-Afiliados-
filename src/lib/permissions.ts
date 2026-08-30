// ==========================================================
// ARCHIVO: src/lib/auth/permissions.ts
// Credi Marketplace
//
// Sistema de permisos RBAC
//
// Roles y capacidades del sistema
//
// Next.js App Router
// TypeScript
// ==========================================================


import type {
  UserRole,
} from "./roles";



// ==========================================================
// PERMISOS DISPONIBLES
// ==========================================================

export const PERMISSIONS = {

  // Usuarios

  USER_READ:
    "user.read",

  USER_UPDATE:
    "user.update",

  USER_DELETE:
    "user.delete",



  // Productos

  PRODUCT_CREATE:
    "product.create",

  PRODUCT_READ:
    "product.read",

  PRODUCT_UPDATE:
    "product.update",

  PRODUCT_DELETE:
    "product.delete",



  // Inventario

  INVENTORY_READ:
    "inventory.read",

  INVENTORY_UPDATE:
    "inventory.update",



  // Ordenes

  ORDER_CREATE:
    "order.create",

  ORDER_READ:
    "order.read",

  ORDER_UPDATE:
    "order.update",



  // Pagos

  PAYMENT_READ:
    "payment.read",

  PAYMENT_PROCESS:
    "payment.process",


  REFUND_CREATE:
    "refund.create",



  // Afiliados

  AFFILIATE_READ:
    "affiliate.read",

  AFFILIATE_CREATE:
    "affiliate.create",

  COMMISSION_READ:
    "commission.read",



  // Sistema

  SETTINGS_MANAGE:
    "settings.manage",

  AUDIT_READ:
    "audit.read",


} as const;



export type Permission =
  typeof PERMISSIONS[
    keyof typeof PERMISSIONS
  ];




// ==========================================================
// MATRIZ DE PERMISOS POR ROL
// ==========================================================

export const ROLE_PERMISSIONS:
Record<
  UserRole,
  Permission[]
> = {



  admin: [

    ...Object.values(
      PERMISSIONS,
    ),

  ],



  seller: [

    PERMISSIONS.USER_READ,

    PERMISSIONS.PRODUCT_CREATE,

    PERMISSIONS.PRODUCT_READ,

    PERMISSIONS.PRODUCT_UPDATE,

    PERMISSIONS.INVENTORY_READ,

    PERMISSIONS.INVENTORY_UPDATE,

    PERMISSIONS.ORDER_READ,

    PERMISSIONS.ORDER_UPDATE,

    PERMISSIONS.PAYMENT_READ,

  ],




  affiliate: [

    PERMISSIONS.PRODUCT_READ,

    PERMISSIONS.ORDER_READ,

    PERMISSIONS.AFFILIATE_READ,

    PERMISSIONS.COMMISSION_READ,

  ],





  customer: [

    PERMISSIONS.PRODUCT_READ,

    PERMISSIONS.ORDER_CREATE,

    PERMISSIONS.ORDER_READ,

  ],





  user: [

    PERMISSIONS.PRODUCT_READ,

    PERMISSIONS.USER_READ,

  ],


};




// ==========================================================
// VERIFICAR PERMISO
// ==========================================================

export function hasPermission(

  role: UserRole,

  permission: Permission,

): boolean {


  return ROLE_PERMISSIONS[
    role
  ]?.includes(
    permission,
  ) ?? false;


}




// ==========================================================
// OBTENER TODOS LOS PERMISOS
// ==========================================================

export function getPermissionsByRole(

  role: UserRole,

): Permission[] {


  return (
    ROLE_PERMISSIONS[
      role
    ] ?? []
  );

}
