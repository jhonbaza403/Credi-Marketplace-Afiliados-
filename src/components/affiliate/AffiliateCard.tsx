// ==========================================================
// ARCHIVO: src/components/affiliate/AffiliateCard.tsx
// Credi Marketplace
//
// Tarjeta de producto afiliado
// Marketplace de afiliados
//
// Next.js 16.3 · React 19 · TypeScript
// ==========================================================

"use client";

import type { AffiliateProduct } from "@/types/affiliate";
import AffiliateCopyButton from "@/components/affiliate/AffiliateCopyButton";

interface AffiliateCardProps {
  product: AffiliateProduct;
  locale?: "es" | "en" | "pt" | "fr";
}

/**
 * Devuelve una clase visual razonable para el badge
 * cuando el producto no proporciona una clase personalizada.
 */
function getDefaultBadgeColor(
  variant: AffiliateProduct["badgeVariant"],
): string {
  switch (variant) {
    case "success":
      return "bg-emerald-600";

    case "warning":
      return "bg-amber-500";

    case "danger":
      return "bg-red-600";

    case "info":
      return "bg-cyan-600";

    case "primary":
    default:
      return "bg-blue-600";
  }
}

export default function AffiliateCard({
  product,
  locale = "es",
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

  /**
   * `affiliateUrl` es obligatorio.
   * `url` se conserva como alias para compatibilidad
   * con datos/componentes existentes.
   */
  const affiliateUrl =
    product.url?.trim() ||
    product.affiliateUrl.trim();

  const badgeColor =
    product.badgeColor?.trim() ||
    getDefaultBadgeColor(
      product.badgeVariant,
    );

  return (
    <article
      className="
        flex
        h-full
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-gray-200
        bg-white
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:shadow-lg
      "
    >
      {/* ==================================================
          CABECERA
      ================================================== */}

      <div
        className="
          flex
          items-start
          justify-between
          gap-4
          p-5
        "
      >
        <div className="min-w-0 flex-1">
          <span
            className={`
              inline-flex
              rounded-full
              px-3
              py-1
              text-xs
              font-semibold
              text-white
              ${badgeColor}
            `}
          >
            {product.badge}
          </span>

          <h3
            className="
              mt-3
              line-clamp-2
              text-xl
              font-bold
              leading-7
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
            shrink-0
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

      {/* ==================================================
          CONTENIDO
      ================================================== */}

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
            line-clamp-4
            text-sm
            leading-6
            text-gray-600
          "
        >
          {description}
        </p>

        <div
          className="
            mt-auto
            flex
            flex-col
            gap-3
            pt-6
          "
        >
          {/* ==================================================
              ENLACE AFILIADO
          ================================================== */}

          <a
            href={affiliateUrl}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            aria-label={`${buttonText}: ${title}`}
            className="
              inline-flex
              min-h-11
              items-center
              justify-center
              rounded-xl
              bg-blue-600
              px-4
              py-3
              text-sm
              font-semibold
              text-white
              transition-all
              hover:bg-blue-700
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-blue-500
              focus-visible:ring-offset-2
            "
          >
            {buttonText}
          </a>

          {/* ==================================================
              COPIAR ENLACE AFILIADO
          ================================================== */}

          <AffiliateCopyButton
            affiliatePath={affiliateUrl}
          />
        </div>
      </div>
    </article>
  );
}
