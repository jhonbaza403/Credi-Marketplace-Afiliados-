import type { Metadata } from "next"
import { redirect } from "next/navigation"
import ProductPublisher from "@/components/marketplace/ProductPublisher"
import { getDatabaseServerClient } from "@/lib/database/server"

export const metadata: Metadata = {
  title: "Publicar producto | Credi Marketplace",
  description: "Publica tu producto con carga de imágenes y asistencia editorial de IA.",
  robots: { index: false, follow: false },
}

export default async function ProductCreatePage() {
  const supabase = await getDatabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/products/create")
  return <ProductPublisher />
}
