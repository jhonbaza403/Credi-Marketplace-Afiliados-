import { redirect } from "next/navigation";

import ComplianceCenter from "@/components/compliance/ComplianceCenter";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Verificación KYC y KYB",
  robots: { index: false, follow: false },
};

export default async function CompliancePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login");

  return <ComplianceCenter />;
}
