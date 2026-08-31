'use client';

// ==========================================================
// ARCHIVO: src/components/ProductGrid.tsx
// Credi Marketplace
//
// NIVEL: PREMIUM / ENTERPRISE
//
// PROPÓSITO:
// Sección premium de productos y plataformas afiliadas.
//
// CARACTERÍSTICAS:
// - Diseño editorial de alta gama.
// - Responsive mobile-first.
// - Internacionalización mediante LanguageContext.
// - Accesibilidad WCAG.
// - Jerarquía visual premium.
// - Estados hover/focus.
// - Indicadores de socio verificado.
// - CTA optimizado para conversión.
// - Compatible con enlaces afiliados.
// - Sin dependencia de estado global adicional.
// - Sin consultas innecesarias.
// - Estructura semántica SEO-friendly.
//
// IMPORTANTE:
// Este componente NO:
// - procesa pagos;
// - administra autenticación;
// - modifica Supabase;
// - gestiona afiliados;
// - registra conversiones.
//
// La URL de afiliación continúa siendo responsabilidad
// exclusiva de src/data/products.
// ==========================================================

import { affiliateProducts } from '@/features/affiliate/data/products';
import { useLanguage } from '@/context/LanguageContext';

// ==========================================================
// COPY INTERNACIONALIZADO
// ==========================================================

const GRID_COPY = {
  es: {
    eyebrow: 'Ecosistema global',
    title: 'Oportunidades seleccionadas para crecer',
    description:
      'Accede a una selección cuidadosamente curada de productos, servicios y plataformas internacionales que complementan el ecosistema de Credi Marketplace.',
    trusted: 'Socios seleccionados',
    explore: 'Explorar oferta',
    external: 'Sitio externo',
    affiliate: 'Oferta de socio',
  },

  en: {
    eyebrow: 'Global ecosystem',
    title: 'Selected opportunities to grow',
    description:
      'Access a carefully curated selection of international products, services and platforms that complement the Credi Marketplace ecosystem.',
    trusted: 'Selected partners',
    explore: 'Explore offer',
    external: 'External website',
    affiliate: 'Partner offer',
  },

  pt: {
    eyebrow: 'Ecossistema global',
    title: 'Oportunidades selecionadas para crescer',
    description:
      'Acesse uma seleção cuidadosamente escolhida de produtos, serviços e plataformas internacionais que complementam o ecossistema Credi Marketplace.',
    trusted: 'Parceiros selecionados',
    explore: 'Explorar oferta',
    external: 'Site externo',
    affiliate: 'Oferta do parceiro',
  },

  fr: {
    eyebrow: 'Écosystème mondial',
    title: 'Des opportunités sélectionnées pour évoluer',
    description:
      'Accédez à une sélection soigneusement organisée de produits, services et plateformes internationales qui complètent l’écosystème Credi Marketplace.',
    trusted: 'Partenaires sélectionnés',
    explore: 'Découvrir l’offre',
    external: 'Site externe',
    affiliate: 'Offre partenaire',
  },
} as const;

// ==========================================================
// COMPONENTE
// ==========================================================

export default function ProductGrid() {
  const { lang } = useLanguage();

  const copy = GRID_COPY[lang];

  return (
    <section
      id="productos"
      aria-labelledby="affiliate-products-title"
      className="
        relative
        overflow-hidden
        border-y
        border-slate-200/70
        bg-slate-50
        py-20
        sm:py-24
        lg:py-28
      "
    >
      {/* ==================================================
          BACKGROUND DECORATIVO
      ================================================== */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          overflow-hidden
        "
      >
        <div
          className="
            absolute
            -right-40
            -top-40
            h-96
            w-96
            rounded-full
            bg-emerald-200/20
            blur-3xl
          "
        />

        <div
          className="
            absolute
            -bottom-40
            -left-40
            h-96
            w-96
            rounded-full
            bg-slate-300/20
            blur-3xl
          "
        />

        <div
          className="
            absolute
            inset-x-0
            top-0
            h-px
            bg-gradient-to-r
            from-transparent
            via-emerald-500/30
            to-transparent
          "
        />
      </div>

      {/* ==================================================
          CONTENEDOR PRINCIPAL
      ================================================== */}

      <div
        className="
          relative
          mx-auto
          max-w-7xl
          px-4
          sm:px-6
          lg:px-8
        "
      >
        {/* =================================================
            CABECERA EDITORIAL
        ================================================== */}

        <header className="mx-auto mb-14 max-w-4xl text-center">
          {/* EYEBROW */}

          <div className="mb-5 flex items-center justify-center gap-3">
            <span
              aria-hidden="true"
              className="
                h-px
                w-8
                bg-emerald-500
                sm:w-12
              "
            />

            <span
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.28em]
                text-emerald-600
              "
            >
              {copy.eyebrow}
            </span>

            <span
              aria-hidden="true"
              className="
                h-px
                w-8
                bg-emerald-500
                sm:w-12
              "
            />
          </div>

          {/* TÍTULO */}

          <h2
            id="affiliate-products-title"
            className="
              text-3xl
              font-black
              tracking-tight
              text-slate-950
              sm:text-4xl
              lg:text-5xl
              lg:leading-[1.08]
            "
          >
            {copy.title}
          </h2>

          {/* DESCRIPCIÓN */}

          <p
            className="
              mx-auto
              mt-5
              max-w-2xl
              text-sm
              leading-7
              text-slate-500
              sm:text-base
            "
          >
            {copy.description}
          </p>

          {/* TRUST INDICATOR */}

          <div className="mt-7 flex items-center justify-center">
            <div
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-emerald-200
                bg-white
                px-4
                py-2
                shadow-sm
              "
            >
              <span
                className="
                  flex
                  h-5
                  w-5
                  items-center
                  justify-center
                  rounded-full
                  bg-emerald-500
                  text-[10px]
                  text-white
                "
                aria-hidden="true"
              >
                ✓
              </span>

              <span
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-600
                "
              >
                {copy.trusted}
              </span>
            </div>
          </div>
        </header>

        {/* =================================================
            GRID
        ================================================== */}

        <div
          className="
            grid
            grid-cols-1
            gap-6
            sm:grid-cols-2
            xl:grid-cols-4
            xl:gap-7
          "
        >
          {affiliateProducts.map((product, index) => (
            <article
              key={product.id}
              className="
                group
                relative
                flex
                min-h-[390px]
                flex-col
                overflow-hidden
                rounded-[1.5rem]
                border
                border-slate-200
                bg-white
                shadow-[0_8px_30px_rgba(15,23,42,0.04)]
                transition-all
                duration-500
                hover:-translate-y-2
                hover:border-slate-300
                hover:shadow-[0_24px_60px_rgba(15,23,42,0.10)]
              "
            >
              {/* =================================================
                  TOP ACCENT
              ================================================== */}

              <div
                aria-hidden="true"
                className="
                  absolute
                  inset-x-0
                  top-0
                  h-1
                  bg-gradient-to-r
                  from-emerald-500
                  via-emerald-400
                  to-teal-500
                  opacity-80
                "
              />

              {/* =================================================
                  CARD HEADER
              ================================================== */}

              <div className="p-6 pb-0">
                <div className="flex items-start justify-between gap-4">
                  {/* BADGE */}

                  <span
                    className={`
                      inline-flex
                      max-w-[75%]
                      items-center
                      rounded-full
                      px-3
                      py-1.5
                      text-[9px]
                      font-black
                      uppercase
                      tracking-[0.12em]
                      text-white
                      shadow-sm
                      ${product.badgeColor}
                    `}
                  >
                    {product.badge}
                  </span>

                  {/* PARTNER ICON */}

                  <div
                    className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-slate-100
                      bg-slate-50
                      transition-all
                      duration-300
                      group-hover:border-emerald-100
                      group-hover:bg-emerald-50
                    "
                    title={copy.affiliate}
                  >
                    <i
                      className={`
                        fa-brands
                        ${product.icon}
                        text-xl
                        text-slate-300
                        transition-colors
                        duration-300
                        group-hover:text-emerald-500
                      `}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>

              {/* =================================================
                  CONTENT
              ================================================== */}

              <div className="flex flex-1 flex-col p-6">
                {/* CATEGORY */}

                <p
                  className="
                    mb-2
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.2em]
                    text-emerald-600
                  "
                >
                  {product.category[lang]}
                </p>

                {/* TITLE */}

                <h3
                  className="
                    min-h-[3.25rem]
                    text-lg
                    font-extrabold
                    leading-tight
                    tracking-tight
                    text-slate-900
                    transition-colors
                    group-hover:text-emerald-700
                  "
                >
                  {product.title[lang]}
                </h3>

                {/* DIVIDER */}

                <div
                  aria-hidden="true"
                  className="
                    my-4
                    h-px
                    w-10
                    bg-emerald-500/50
                    transition-all
                    duration-300
                    group-hover:w-16
                  "
                />

                {/* DESCRIPTION */}

                <p
                  className="
                    line-clamp-4
                    text-sm
                    leading-6
                    text-slate-500
                  "
                >
                  {product.description[lang]}
                </p>

                {/* TRUST */}

                <div className="mt-auto pt-6">
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wider
                      text-slate-400
                    "
                  >
                    <span
                      className="
                        h-1.5
                        w-1.5
                        rounded-full
                        bg-emerald-500
                      "
                      aria-hidden="true"
                    />

                    {copy.trusted}
                  </div>
                </div>
              </div>

              {/* =================================================
                  CTA
              ================================================== */}

              <div className="px-6 pb-6">
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  referrerPolicy="no-referrer-when-downgrade"
                  aria-label={`${product.buttonText[lang]} - ${product.name}`}
                  className="
                    group/cta
                    flex
                    w-full
                    items-center
                    justify-center
                    gap-3
                    rounded-xl
                    border
                    border-slate-900
                    bg-slate-950
                    px-5
                    py-3.5
                    text-center
                    text-sm
                    font-bold
                    text-white
                    shadow-lg
                    shadow-slate-900/10
                    transition-all
                    duration-300
                    hover:border-emerald-600
                    hover:bg-emerald-600
                    hover:shadow-emerald-600/20
                    focus:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-emerald-500
                    focus-visible:ring-offset-2
                  "
                >
                  <span>
                    {product.buttonText[lang] ||
                      copy.explore}
                  </span>

                  <i
                    className="
                      fa-solid
                      fa-arrow-up-right-from-square
                      text-[11px]
                      opacity-70
                      transition-transform
                      duration-300
                      group-hover/cta:translate-x-0.5
                      group-hover/cta:-translate-y-0.5
                    "
                    aria-hidden="true"
                  />
                </a>

                {/* EXTERNAL SITE LABEL */}

                <p
                  className="
                    mt-3
                    text-center
                    text-[9px]
                    font-medium
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  {copy.external}
                </p>
              </div>

              {/* =================================================
                  CARD INDEX — DETALLE PREMIUM
              ================================================== */}

              <span
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  bottom-5
                  right-5
                  select-none
                  text-[9px]
                  font-black
                  tracking-[0.2em]
                  text-slate-200
                  transition-colors
                  group-hover:text-emerald-100
                "
              >
                {String(index + 1).padStart(2, '0')}
              </span>
            </article>
          ))}
        </div>

        {/* =================================================
            FOOTER DE SECCIÓN
        ================================================== */}

        <div className="mt-12 flex justify-center">
          <div
            className="
              flex
              max-w-2xl
              items-center
              gap-3
              rounded-2xl
              border
              border-slate-200
              bg-white/80
              px-5
              py-3
              text-center
              shadow-sm
              backdrop-blur
            "
          >
            <i
              className="
                fa-solid
                fa-shield-halved
                text-sm
                text-emerald-500
              "
              aria-hidden="true"
            />

            <p
              className="
                text-[10px]
                font-medium
                leading-5
                text-slate-500
              "
            >
              {copy.affiliate}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
