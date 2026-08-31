```tsx
// ==========================================================
// ARCHIVO:
// src/app/admin/page.tsx
//
// Credi Marketplace
//
// Página administrativa
//
// Protección Server Side
//
// Next.js 16 App Router
// ==========================================================

import type { Metadata } from "next";
import type { ReactElement } from "react";

import AdminDashboard from "@/components/admin/AdminDashboard";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Administración | Credi Marketplace",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage(): Promise<ReactElement> {
  await requireAdmin();

  return <AdminDashboard />;
}
```
