// ==========================================================
// ARCHIVO: src/components/seller/B2BMarketplace.tsx
// Credi Marketplace
//
// Marketplace B2B para vendedores
//
// Next.js 16.3 · React 19.2 · TypeScript
// ==========================================================


interface B2BProduct {

  id: string;

  name: string;

  price: number;

  stock: number;

  seller: string;

}



interface B2BMarketplaceProps {

  products: readonly B2BProduct[];

}



export default function B2BMarketplace({

  products,

}: B2BMarketplaceProps) {


  return (

    <section

      className="
        rounded-xl

        border

        bg-white

        p-6

        shadow-sm
      "

    >

      <header className="mb-6">

        <h2

          className="
            text-2xl
            font-bold
          "

        >

          Marketplace B2B

        </h2>

        <p

          className="
            text-sm
            text-gray-600
          "

        >

          Productos disponibles para compras empresariales.

        </p>

      </header>



      <div

        className="
          grid

          gap-4

          md:grid-cols-2

          lg:grid-cols-3
        "

      >

        {
          products.map(

            (product) => (

              <article

                key={product.id}

                className="
                  rounded-lg

                  border

                  p-4
                "

              >

                <h3 className="font-semibold">

                  {product.name}

                </h3>


                <p>

                  Precio:
                  ${product.price}

                </p>


                <p>

                  Stock:
                  {product.stock}

                </p>


                <p

                  className="
                    text-sm
                    text-gray-500
                  "

                >

                  Vendedor:
                  {product.seller}

                </p>


              </article>

            )

          )
        }

      </div>


    </section>

  );

}
