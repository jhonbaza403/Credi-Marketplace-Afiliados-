import type { Metadata } from "next"
import AffiliateLinksWorkspace from "@/components/affiliate/AffiliateLinksWorkspace"

export const metadata: Metadata = {
  title: "Enlaces y comisiones | Credi Marketplace",
  robots: { index: false, follow: false },
}

export default function AffiliateLinksPage() {
  return <AffiliateLinksWorkspace />
}
