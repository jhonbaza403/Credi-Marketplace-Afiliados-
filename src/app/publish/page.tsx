import { redirect } from "next/navigation";
import DomainBridge from "@/components/portal/DomainBridge"

import PublishCenter from "@/features/social/components/PublishCenter";
import { getDatabaseServerClient } from "@/lib/database/server";

export const metadata = {
  title: "Publicar | Credi Marketplace",
  description: "Publica productos y contenido social desde tu cuenta de Credi Marketplace.",
  robots: { index: false, follow: false },
};

export default async function PublishPage() {
  const supabase = await getDatabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/publish");

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <DomainBridge context="publish" />
        <div className="mt-6">
          <PublishCenter />
        </div>
      </div>
    </main>
  );
}
