import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata = {
  title: "Administración",
  robots: { index: false, follow: false }
};

export default async function AdminPage() {
  await requireAdmin();
  return <AdminDashboard />;
}
