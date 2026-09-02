import type { Metadata } from 'next';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { requireAdmin } from '@/lib/auth/guards';

export const metadata: Metadata = {
  title: 'Administración | Credi Marketplace',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  await requireAdmin();
  return <AdminDashboard />;
}
