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


import {
  requireAdmin,
} from "@/lib/auth/guards";


import AdminDashboard from "@/components/admin/AdminDashboard";



// ==========================================================
// PAGE
// ==========================================================

export default async function AdminPage() {


  await requireAdmin();



  return (

    <AdminDashboard />

  );


}
