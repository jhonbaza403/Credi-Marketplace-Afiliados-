// ==========================================================
// ARCHIVO: src/app/products/page.tsx
// Credi Marketplace
//
// Products Marketplace Page
//
// Next.js App Router
// TypeScript
// ==========================================================

import Link from "next/link";

import ProductCard from "@/components/marketplace/ProductCard";

import {
  getProducts,
} from "@/lib/database";



// ==========================================================
// TIPOS
// ==========================================================

interface Product {

  id: string;

  name: string;

  slug?: string;

  description?: string;

  price: number;

  image?: string;

}



// ==========================================================
// SEO
// ==========================================================

export const metadata = {

  title:
    "Productos | Credi Marketplace",

  description:
    "Marketplace B2B, afiliados y comercio digital",

};




// ==========================================================
// PAGE
// ==========================================================

export default async function ProductsPage() {


  const products =
    await getProducts(50) as Product[];




  return (

    <main className="min-h-screen bg-background">


      <section className="container mx-auto px-6 py-10">


        <div className="mb-10">


          <h1 className="text-4xl font-bold">

            Productos

          </h1>


          <p className="mt-3 text-muted-foreground">

            Explora productos disponibles
            en Credi Marketplace.

          </p>


        </div>





        {
          products.length === 0 ? (

            <div className="rounded-xl border p-8 text-center">

              No existen productos disponibles.

            </div>


          ) : (


            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">


              {
                products.map(
                  (product) => {


                    const affiliatePath =

                      `/products/detail?id=${encodeURIComponent(
                        product.id
                      )}&ref=afiliado`;



                    return (

                      <div
                        key={product.id}
                        className="space-y-3"
                      >


                        <ProductCard

                          product={product}

                        />



                        <Link

                          href={affiliatePath}

                          className="
                            inline-flex
                            items-center
                            justify-center
                            rounded-lg
                            border
                            px-4
                            py-2
                            text-sm
                            font-medium
                            hover:bg-muted
                          "

                        >

                          Compartir como afiliado


                        </Link>


                      </div>

                    );

                  }

                )

              }


            </div>


          )

        }


      </section>


    </main>

  );

}
