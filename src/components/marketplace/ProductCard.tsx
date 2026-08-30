// ==========================================================
// ARCHIVO: src/components/marketplace/ProductCard.tsx
// Credi Marketplace
//
// Tarjeta individual de producto
//
// Next.js 16.3 · React 19.2 · TypeScript
// ==========================================================

import Link from 'next/link';

import Badge from '@/components/ui/Badge';



interface ProductCardProps<T> {

  product: T;

}



interface MarketplaceProduct {

  id: string;

  name: string;

  title?: string;

  description?: string;

  category?: string;

  price?: number;

  currency?: string;

  image?: string;

  badge?: string;

}



export default function ProductCard<T extends MarketplaceProduct>({

  product,

}: ProductCardProps<T>) {


  return (

    <article

      className="
        overflow-hidden

        rounded-xl

        border

        bg-white

        shadow-sm

        transition

        hover:shadow-lg
      "

    >


      {/* IMAGE */}

      <div

        className="
          flex
          h-48

          items-center
          justify-center

          bg-gray-100
        "

      >

        {
          product.image ? (

            <img

              src={product.image}

              alt={product.name}

              className="
                h-full
                w-full
                object-cover
              "

            />

          ) : (

            <span

              className="
                text-gray-400
              "

            >

              Sin imagen

            </span>

          )
        }

      </div>



      {/* CONTENT */}

      <div

        className="
          space-y-3

          p-5
        "

      >


        {
          product.badge && (

            <Badge

              variant="primary"

            >

              {product.badge}

            </Badge>

          )
        }



        <h3

          className="
            text-lg

            font-semibold

            text-gray-900
          "

        >

          {product.title ?? product.name}

        </h3>



        {
          product.description && (

            <p

              className="
                line-clamp-2

                text-sm

                text-gray-600
              "

            >

              {product.description}

            </p>

          )
        }



        {
          product.price && (

            <p

              className="
                text-xl

                font-bold

                text-blue-600
              "

            >

              {product.currency ?? '$'}

              {product.price}

            </p>

          )
        }



        <Link

          href={`/products/${product.id}`}

          className="
            block

            rounded-lg

            bg-blue-600

            px-4

            py-2

            text-center

            font-medium

            text-white

            hover:bg-blue-700
          "

        >

          Ver producto

        </Link>


      </div>


    </article>

  );

}
