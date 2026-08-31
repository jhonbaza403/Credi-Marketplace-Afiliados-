```tsx
// ==========================================================
// ARCHIVO:
// src/app/dashboard/admin/page.tsx
//
// Credi Marketplace
//
// Protección administrativa Server Side
//
// Next.js 16 App Router
// ==========================================================

import type { ReactElement } from "react";

import AdminDashboard from "@/components/admin/AdminDashboard";
import { requireAdmin } from "@/lib/auth/guards";

export default async function AdminPage(): Promise<ReactElement> {
  await requireAdmin();

  return <AdminDashboard />;
}
```
