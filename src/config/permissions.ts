import type { UserRole } from '@/types/user';

export const PERMISSIONS = {
  viewMarketplace: ['customer', 'vendor', 'professional', 'company', 'admin'],
  manageOwnProducts: ['vendor', 'company', 'admin'],
  manageOwnOrders: ['customer', 'vendor', 'company', 'admin'],
  manageServices: ['professional', 'company', 'admin'],
  manageUsers: ['admin'],
  managePayments: ['admin'],
  accessAdmin: ['admin'],
} as const satisfies Record<string, readonly UserRole[]>;

export function hasPermission(
  role: UserRole,
  permission: keyof typeof PERMISSIONS,
): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}
