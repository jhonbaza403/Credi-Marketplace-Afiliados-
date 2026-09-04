import type { Metadata } from "next";

import { ExternalAffiliateLinks } from "@/components/affiliate/ExternalAffiliateLinks";

export const metadata: Metadata = {
  title: "Socios comerciales",
  description: "Acceso a socios comerciales externos de Credi Marketplace.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PartnersPage() {
  return (
    <main className="min-h-screen bg-marketplace-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <ExternalAffiliateLinks />
      </div>
    </main>
  );
}
