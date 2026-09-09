import type { Metadata } from "next"
import { redirect } from "next/navigation"
import B2BProductPublisher from "@/components/b2b/B2BProductPublisher"
import { getDatabaseServerClient } from "@/lib/database/server"

export const metadata: Metadata = { title: "Publicar oferta B2B | Credi Marketplace", robots: { index: false, follow: false } }

export default async function B2BPublishPage() {
  const supabase = await getDatabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/b2b/publish")
  return <B2BProductPublisher />
}
