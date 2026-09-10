import B2BMarketplace from "@/components/seller/B2BMarketplace";
import B2BProductPublisher from "@/components/marketplace/B2BProductPublisher";

export const metadata = {
  title: "Marketplace B2B | Credi",
  robots: {
    index: false,
    follow: false,
  },
};

export default function B2BPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <B2BProductPublisher />
        <B2BMarketplace />
      </div>
    </main>
  );
}
