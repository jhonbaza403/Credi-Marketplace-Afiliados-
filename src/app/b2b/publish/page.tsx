import type { Metadata } from "next"
import B2BProductPublisher from "@/components/b2b/B2BProductPublisher"

export const metadata: Metadata = {
  title: "Publicar oferta B2B | Credi Marketplace",
  robots: { index: false, follow: false },
}

export default function B2BPublishPage() {
  return <B2BProductPublisher />
}
