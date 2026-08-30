'use client';

// ==========================================================
// ARCHIVO: src/components/Hero.tsx
// Credi Marketplace
//
// Hero principal de la plataforma.
//
// RESPONSABILIDADES:
// - Presentar la propuesta de valor de Credi Marketplace.
// - Mostrar acceso al catálogo.
// - Mostrar acceso al programa de afiliados.
// - Utilizar exclusivamente el sistema global de traducciones.
//
// IMPORTANTE:
// - No definir traducciones dentro de este componente.
// - No consultar Supabase directamente.
// - No duplicar información proveniente de otros contextos.
// ==========================================================

import Link from 'next/link';

import { useLanguage } from '@/context/LanguageContext';

// ==========================================================
// COMPONENTE
// ==========================================================

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <div
        className="
          relative
          overflow-hidden
          rounded-3xl
          bg-gradient-to-br
          from-slate-950
          via-slate-900
          to-emerald-950
          px-6
          py-10
          text-white
          shadow-xl
          sm:px-8
          md:px-12
          md:py-14
        "
      >
        {/* ==================================================
            DECORACIÓN DE FONDO
        ================================================== */}

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -right-24
            -top-24
            h-64
            w-64
            rounded-full
            bg-emerald-500/10
            blur-3xl
          "
        />

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -bottom-32
            left-1/3
            h-72
            w-72
            rounded-full
            bg-blue-500/10
            blur-3xl
          "
        />

        {/* ==================================================
            CONTENIDO
        ================================================== */}

        <div
          className="
            relative
            z-10
            flex
            flex-col
            items-center
            justify-between
            gap-8
            md:flex-row
          "
        >
          {/* =================================================
              TEXTO PRINCIPAL
          ================================================= */}

          <div className="max-w-2xl">

            {/* Etiqueta */}
            <span
              className="
                inline-flex
                items-center
                rounded-full
                border
                border-emerald-500/30
                bg-emerald-500/10
                px-3
                py-1
                text-[10px]
                font-bold
                uppercase
                tracking-widest
                text-emerald-400
              "
            >
              <span
                aria-hidden="true"
                className="
                  mr-2
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-emerald-400
                "
              />

              {t('bannerTag')}
            </span>

            {/* Título */}
            <h1
              id="hero-title"
              className="
                mt-4
                text-3xl
                font-black
                leading-tight
                tracking-tight
                sm:text-4xl
                md:text-5xl
              "
            >
              {t('bannerTitle')}
            </h1>

            {/* Descripción */}
            <p
              className="
                mt-4
                max-w-xl
                text-sm
                leading-6
                text-slate-300
                sm:text-base
                sm:leading-7
              "
            >
              {t('bannerDesc')}
            </p>

            {/* Indicadores de valor */}
            <div
              className="
                mt-6
                flex
                flex-wrap
                gap-x-5
                gap-y-2
                text-xs
                font-medium
                text-slate-300
              "
            >
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="text-emerald-400"
                >
                  ✓
                </span>
                Comercio global
              </span>

              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="text-emerald-400"
                >
                  ✓
                </span>
                Enlaces verificados
              </span>

              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="text-emerald-400"
                >
                  ✓
                </span>
                Oportunidades digitales
              </span>
            </div>
          </div>

          {/* =================================================
              ACCIONES
          ================================================= */}

          <div
            className="
              flex
              w-full
              shrink-0
              flex-col
              gap-3
              sm:flex-row
              md:w-auto
              md:flex-col
              lg:flex-row
            "
          >
            {/* Catálogo */}
            <Link
              href="/#productos"
              className="
                inline-flex
                min-w-[180px]
                items-center
                justify-center
                rounded-2xl
                bg-emerald-500
                px-6
                py-3.5
                text-center
                text-sm
                font-bold
                text-slate-950
                shadow-lg
                shadow-emerald-950/30
                transition-all
                hover:scale-[1.02]
                hover:bg-emerald-400
                active:scale-[0.98]
                focus:outline-none
                focus-visible:ring-2
                focus-visible:ring-emerald-400
                focus-visible:ring-offset-2
                focus-visible:ring-offset-slate-900
              "
            >
              Ver Catálogo
              <span
                aria-hidden="true"
                className="ml-2"
              >
                →
              </span>
            </Link>

            {/* Afiliados */}
            <Link
              href="/dashboard/affiliate"
              className="
                inline-flex
                min-w-[180px]
                items-center
                justify-center
                rounded-2xl
                border
                border-slate-700
                bg-slate-800/80
                px-6
                py-3.5
                text-center
                text-sm
                font-bold
                text-white
                transition-all
                hover:scale-[1.02]
                hover:bg-slate-700
                active:scale-[0.98]
                focus:outline-none
                focus-visible:ring-2
                focus-visible:ring-slate-400
                focus-visible:ring-offset-2
                focus-visible:ring-offset-slate-900
              "
            >
              Panel de Afiliados
              <span
                aria-hidden="true"
                className="ml-2"
              >
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
