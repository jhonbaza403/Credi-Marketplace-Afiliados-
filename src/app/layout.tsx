import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/styles/premium-form-surfaces.css";
import "@/styles/readability.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MarketplaceAtmosphere from "@/components/layout/MarketplaceAtmosphere";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { RegionProvider } from "@/context/RegionContext";
import { CANONICAL_APP_URL } from "@/lib/app-url";

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_APP_URL),
  title: { default: "Credi Marketplace", template: "%s | Credi Marketplace" },
  description: "Plataforma empresarial de comercio digital, marketplace B2B, afiliados, productos, servicios y pagos.",
  applicationName: "Credi Marketplace",
  keywords: ["Marketplace", "B2B", "Afiliados", "Comercio electrónico", "Ventas digitales", "Productos", "Servicios"],
  authors: [{ name: "Credi Marketplace" }],
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    title: "Credi Marketplace",
    description: "Marketplace empresarial B2B, afiliados y comercio digital.",
    type: "website",
    locale: "es_ES",
    siteName: "Credi Marketplace",
    url: CANONICAL_APP_URL,
  },
  icons: { icon: "/logo.png", shortcut: "/logo.png", apple: "/logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050816",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased" suppressHydrationWarning>
        <MarketplaceAtmosphere />
        <LanguageProvider>
          <RegionProvider>
            <AuthProvider>
              <CartProvider>
                <div className="relative z-10 flex min-h-screen flex-col">
                  <Header />
                  <main className="app-content-layer flex-1">
                    <div className="app-readable-surface min-h-full">{children}</div>
                  </main>
                  <Footer />
                </div>
              </CartProvider>
            </AuthProvider>
          </RegionProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
