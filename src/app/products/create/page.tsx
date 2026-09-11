import type { Metadata } from "next"
import { redirect } from "next/navigation"
import ProductPublisher from "@/components/marketplace/ProductPublisher"
import { getDatabaseServerClient } from "@/lib/database/server"

export const metadata: Metadata = {
  title: "Registrar bienes y servicios | Credi Marketplace",
  description: "Registra bienes y servicios con galería de imágenes, vídeo, asistencia editorial de IA y publicación multicanal.",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function ProductCreatePage() {
  const supabase = await getDatabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/products/create")
  return <ProductPublisher />
}
