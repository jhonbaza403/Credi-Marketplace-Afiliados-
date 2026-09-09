import type { Metadata, Viewport } from "next";

import "./globals.css";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { RegionProvider } from "@/context/RegionContext";

export const metadata: Metadata = {
  title: {
    default: "Credi Marketplace",
    template: "%s | Credi Marketplace",
  },
  description:
    "Plataforma empresarial de comercio digital, marketplace B2B, afiliados, productos, servicios y pagos.",
  applicationName: "Credi Marketplace",
  keywords: [
    "Marketplace",
    "B2B",
    "Afiliados",
    "Comercio electrónico",
    "Ventas digitales",
    "Productos",
    "Servicios",
  ],
  authors: [{ name: "Credi Marketplace" }],
  robots: { index: true, follow: true },
  openGraph: {
    title: "Credi Marketplace",
    description: "Marketplace empresarial B2B, afiliados y comercio digital.",
    type: "website",
    locale: "es_ES",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased" suppressHydrationWarning>
        <LanguageProvider>
          <RegionProvider>
            <AuthProvider>
              <CartProvider>
                <div className="flex min-h-screen flex-col">
                  <Header />
                  <main className="flex-1">{children}</main>
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
