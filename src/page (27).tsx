import type { Metadata } from "next";

import B2BMarketplace from "@/components/marketplace/B2BMarketplace";


// ==========================================================
// METADATA SEO
// ==========================================================

export const metadata: Metadata = {

  title:
    "Mercado B2B y Mayoristas | Credi Marketplace",

  description:
    "Compra al mayor directamente de proveedores, fabricantes e importadores. Descubre ofertas B2B y gestiona tus operaciones comerciales de forma segura.",

  keywords: [
    "B2B",
    "mercado mayorista",
    "proveedores",
    "fabricantes",
    "importadores",
    "compras al mayor",
    "comercio empresarial",
    "Credi Marketplace",
  ],

  alternates: {
    canonical: "/b2b",
  },

  openGraph: {

    title:
      "Mercado B2B y Mayoristas | Credi Marketplace",

    description:
      "Conecta con proveedores, fabricantes e importadores y realiza compras mayoristas desde Credi Marketplace.",

    type:
      "website",

    siteName:
      "Credi Marketplace",

    url:
      "/b2b",

  },

  robots: {

    index: true,

    follow: true,

  },

};



// ==========================================================
// PAGE
// ==========================================================

export default function B2BPage() {

  return (

    <main
      id="main-content"
      className="min-h-screen bg-background text-foreground"
    >

      <section
        aria-labelledby="b2b-marketplace-title"
        className="py-6 sm:py-8 lg:py-10"
      >

        <div
          className="
            mx-auto
            w-full
            max-w-[1600px]
            px-4
            sm:px-6
            lg:px-8
          "
        >

          <h1
            id="b2b-marketplace-title"
            className="sr-only"
          >
            Mercado B2B y Mayoristas
          </h1>


          <B2BMarketplace />


        </div>

      </section>

    </main>

  );

}
