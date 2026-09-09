import type { Metadata } from "next"
import { redirect } from "next/navigation"
import AffiliateLinksWorkspace from "@/components/affiliate/AffiliateLinksWorkspace"
import { getDatabaseServerClient } from "@/lib/database/server"

export const metadata: Metadata = { title: "Enlaces y comisiones | Credi Marketplace", robots: { index: false, follow: false } }

export default async function AffiliateLinksPage() {
  const supabase = await getDatabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/dashboard/affiliate/links")
  return <AffiliateLinksWorkspace />
}
