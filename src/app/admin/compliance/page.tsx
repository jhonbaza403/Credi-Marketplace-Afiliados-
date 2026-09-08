import ComplianceQueue from "@/components/admin/ComplianceQueue";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata = {
  title: "Compliance KYC / KYB",
  robots: { index: false, follow: false },
};

export default async function AdminCompliancePage() {
  await requireAdmin();
  return <ComplianceQueue />;
}
