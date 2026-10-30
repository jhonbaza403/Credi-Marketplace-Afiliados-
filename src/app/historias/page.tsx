import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DomainBridge from "@/components/portal/DomainBridge";
import PublishCenter from "@/features/social/components/PublishCenter";
import { getDatabaseServerClient } from "@/lib/database/server";

export const metadata: Metadata = {
  title: "Crear historia | Credi Marketplace",
  description: "Crea una historia para tu comunidad desde el estudio de publicaciones de Credi.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function HistoriasPage() {
  const supabase = await getDatabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/historias");

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <DomainBridge context="publish" />
        <div className="mt-6">
          <PublishCenter initialType="story" />
        </div>
      </div>
    </main>
  );
}
