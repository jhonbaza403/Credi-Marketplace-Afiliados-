// ==========================================================
// ARCHIVO: src/components/affiliate/AffiliateCard.tsx
// Credi Marketplace
//
// Tarjeta de producto afiliado
// Marketplace de afiliados
//
// Next.js 16.3 · React 19.2 · TypeScript
// ==========================================================

'use client';

import type { AffiliateProduct } from '@/types/affiliate';
import AffiliateCopyButton from '@/components/AffiliateCopyButton';


interface AffiliateCardProps {
  product: AffiliateProduct;
  locale?: 'es' | 'en' | 'pt' | 'fr';
}


export default function AffiliateCard({
  product,
  locale = 'es',
}: AffiliateCardProps) {

  const title =
    product.title[locale] ??
    product.title.es;

  const description =
    product.description[locale] ??
    product.description.es;

  const buttonText =
    product.buttonText[locale] ??
    product.buttonText.es;


  return (
    <article
      className="
        flex
        flex-col
        overflow-hidden
        rounded-2xl
        border
        bg-white
        shadow-sm
        transition
        hover:shadow-lg
      "
    >

      {/* Cabecera */}
      <div
        className="
          flex
          items-center
          justify-between
          p-5
        "
      >

        <div>

          <span
            className={`
              inline-flex
              rounded-full
              px-3
              py-1
              text-xs
              font-semibold
              text-white
              ${product.badgeColor}
            `}
          >
            {product.badge}
          </span>


          <h3
            className="
              mt-3
              text-xl
              font-bold
              text-gray-900
            "
          >
            {title}
          </h3>

        </div>


        <div
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-full
            bg-gray-100
            text-2xl
          "
          aria-hidden="true"
        >
          {product.icon}
        </div>

      </div>



      {/* Contenido */}
      <div
        className="
          flex
          flex-1
          flex-col
          px-5
          pb-5
        "
      >

        <p
          className="
            text-sm
            leading-relaxed
            text-gray-600
          "
        >
          {description}
        </p>


        <div
          className="
            mt-auto
            pt-5
            flex
            flex-col
            gap-3
          "
        >

          {/* Link afiliado */}
          <a
            href={product.url}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="
              inline-flex
              items-center
              justify-center
              rounded-lg
              bg-blue-600
              px-4
              py-3
              font-semibold
              text-white
              transition
              hover:bg-blue-700
            "
          >
            {buttonText}
          </a>


          {/* Compartir/copiar afiliado */}
          <AffiliateCopyButton
            url={product.url}
          />

        </div>

      </div>


    </article>
  );
}
