```tsx
import type { ReactElement } from "react";

import AdminDashboard from "@/components/admin/AdminDashboard";
import { requireAdmin } from "@/lib/auth/guards";

export default async function DashboardAdminPage(): Promise<ReactElement> {
  await requireAdmin();

  return <AdminDashboard />;
}
```
