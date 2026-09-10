import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import B2BProductPublisher from "@/components/marketplace/B2BProductPublisher"
import { getDatabaseServerClient } from "@/lib/database/server"

export const metadata: Metadata = {
  title: "Publicar oferta B2B | Credi Marketplace",
  description: "Publica una oferta mayorista con imagen y vídeo en Credi Marketplace.",
  robots: { index: false, follow: false },
}

export default async function B2BPublishPage() {
  const supabase = await getDatabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/b2b/publish")

  return <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><div className="mb-5"><Link href="/b2b" className="text-sm font-bold text-muted-foreground hover:text-foreground">← Volver al B2B</Link></div><B2BProductPublisher /></div></main>
}
