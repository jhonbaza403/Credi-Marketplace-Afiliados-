// ==========================================================
// ARCHIVO: src/app/layout.tsx
// Credi Marketplace
//
// Root Layout Global Empresarial
//
// Next.js 16
// React 19
// TypeScript
// ==========================================================

import type { Metadata, Viewport } from "next";

import "./globals.css";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { RegionProvider } from "@/context/RegionContext";


// ==========================================================
// METADATA GLOBAL
// ==========================================================

export const metadata: Metadata = {

  title: {
    default: "Credi Marketplace",
    template: "%s | Credi Marketplace",
  },

  description:
    "Plataforma empresarial de comercio digital, marketplace B2B, afiliados, productos, servicios y pagos.",


  applicationName:
    "Credi Marketplace",


  keywords: [
    "Marketplace",
    "B2B",
    "Afiliados",
    "Comercio electrónico",
    "Ventas digitales",
    "Productos",
    "Servicios",
  ],


  authors: [
    {
      name:
        "Credi Marketplace",
    },
  ],


  robots: {
    index: true,
    follow: true,
  },


  openGraph: {

    title:
      "Credi Marketplace",

    description:
      "Marketplace empresarial B2B, afiliados y comercio digital.",

    type:
      "website",

    locale:
      "es_ES",

  },

};



// ==========================================================
// VIEWPORT
// ==========================================================

export const viewport: Viewport = {

  width:
    "device-width",

  initialScale:
    1,

  themeColor:
    "#0f172a",

};



// ==========================================================
// ROOT LAYOUT
// ==========================================================

export default function RootLayout({

  children,

}: Readonly<{

  children: React.ReactNode;

}>) {


return (

<html
lang="es"
suppressHydrationWarning
>


<body
suppressHydrationWarning
>


<LanguageProvider>


<RegionProvider>


<AuthProvider>


<CartProvider>


{children}


</CartProvider>


</AuthProvider>


</RegionProvider>


</LanguageProvider>


</body>


</html>

);


}
