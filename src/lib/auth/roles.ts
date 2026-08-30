// ==========================================================
// ARCHIVO: src/lib/auth/roles.ts
// Credi Marketplace
//
// Sistema de Roles RBAC
//
// Role Based Access Control
//
// Next.js App Router
// TypeScript
// ==========================================================


// ==========================================================
// ROLES DISPONIBLES
// ==========================================================

export const USER_ROLES = {

  ADMIN: "admin",

  SELLER: "seller",

  AFFILIATE: "affiliate",

  CUSTOMER: "customer",

  USER: "user",

} as const;



export type UserRole =
  typeof USER_ROLES[
    keyof typeof USER_ROLES
  ];




// ==========================================================
// VALIDACIÓN DE ROLES
// ==========================================================

export function isValidRole(
  role?: string | null,
): role is UserRole {

  if (!role) {

    return false;

  }


  return Object
    .values(USER_ROLES)
    .includes(
      role as UserRole,
    );

}




// ==========================================================
// NOMBRE LEGIBLE
// ==========================================================

export function getRoleLabel(
  role: UserRole,
): string {


  const labels: Record<
    UserRole,
    string
  > = {


    admin:
      "Administrador",


    seller:
      "Vendedor B2B",


    affiliate:
      "Afiliado",


    customer:
      "Cliente",


    user:
      "Usuario",

  };


  return labels[role];

}




// ==========================================================
// JERARQUÍA DE PRIVILEGIOS
// ==========================================================

export const ROLE_PRIORITY:
Record<UserRole, number> = {


  user:
    1,


  customer:
    2,


  affiliate:
    3,


  seller:
    4,


  admin:
    5,

};





export function hasHigherRole(
  currentRole: UserRole,
  requiredRole: UserRole,
): boolean {


  return (
    ROLE_PRIORITY[currentRole]
    >=
    ROLE_PRIORITY[requiredRole]
  );

}
