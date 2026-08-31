```tsx
// ==========================================================
// ARCHIVO:
// src/app/admin/page.tsx
//
// Credi Marketplace
//
// Panel administrativo principal
//
// Next.js 16 App Router
// TypeScript
// Server Component
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
  description:
    "Centro administrativo de Credi Marketplace para gestionar usuarios, productos, órdenes, vendedores y operaciones de la plataforma.",
  robots: {
    index: false,
    follow: false,
  },
};

// ==========================================================
// PAGE
// ==========================================================

export default async function AdminPage(): Promise<ReactElement> {
  // --------------------------------------------------------
  // Protección administrativa SERVER SIDE
  // --------------------------------------------------------
  //
  // El usuario debe estar autenticado y tener permisos
  // administrativos. Esta validación ocurre en el servidor.
  //
  await requireAdmin();

  // --------------------------------------------------------
  // Dashboard administrativo
  // --------------------------------------------------------

  return <AdminDashboard />;
}
```
