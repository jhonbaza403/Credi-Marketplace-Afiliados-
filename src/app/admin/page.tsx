```tsx
// ==========================================================
// ARCHIVO:
// src/app/admin/page.tsx
//
// Credi Marketplace
//
// Panel administrativo principal
// Protección Server Side
//
// Next.js 16 App Router
// TypeScript
// ==========================================================

import type { Metadata } from "next";
import type { ReactElement } from "react";

import AdminDashboard from "@/components/admin/AdminDashboard";
import { requireAdmin } from "@/lib/auth/guards";

// ==========================================================
// METADATA
// ==========================================================

export const metadata: Metadata = {
  title: "Administración | Credi Marketplace",
  description: "Centro administrativo de Credi Marketplace",
  robots: {
    index: false,
    follow: false,
  },
};

// ==========================================================
// PAGE
// ==========================================================

export default async function AdminPage(): Promise<ReactElement> {
  // Protección administrativa en el servidor.
  await requireAdmin();

  return <AdminDashboard />;
}
```
