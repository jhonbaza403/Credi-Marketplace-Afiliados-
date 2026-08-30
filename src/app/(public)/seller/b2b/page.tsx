import type { Metadata } from 'next';

import B2BProductForm from '@/components/seller/B2BProductForm';

// ==========================================================
// ARCHIVO: src/app/seller/b2b/page.tsx
// Credi Marketplace
//
// Publicación de productos mayoristas B2B.
//
// RESPONSABILIDADES:
// - Presentar el módulo de publicación B2B.
// - Mantener una experiencia visual premium.
// - Preparar metadatos SEO.
// - Mantener separación entre página y formulario.
// - No realizar consultas directas a Supabase.
// ==========================================================

export const metadata: Metadata = {
  title: 'Publicar producto mayorista B2B | Credi Marketplace',
  description:
    'Publica productos y lotes mayoristas en Credi Marketplace y conecta con compradores profesionales mediante una experiencia B2B segura y moderna.',
};

// ==========================================================
// PÁGINA
// ==========================================================

export default function SellerB2BPage() {
  return (
    <main
      className="
        relative
        min-h-[calc(100vh-4rem)]
        overflow-hidden
        bg-[var(--background)]
        text-[var(--foreground)]
      "
    >
      {/* ==================================================
          FONDO DECORATIVO
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
            -left-32
            -top-32
            size-96
            rounded-full
            bg-[var(--primary)]/8
            blur-3xl
          "
        />

        <div
          className="
            absolute
            -right-32
            top-20
            size-96
            rounded-full
            bg-cyan-500/8
            blur-3xl
          "
        />

        <div
          className="
            absolute
            inset-x-0
            top-0
            h-px
            bg-linear-to-r
            from-transparent
            via-[var(--border)]
            to-transparent
          "
        />
      </div>

      {/* ==================================================
          CONTENIDO
      ================================================== */}

      <div
        className="
          relative
          mx-auto
          w-full
          max-w-7xl
          px-4
          py-8
          sm:px-6
          sm:py-10
          lg:px-8
          lg:py-12
        "
      >
        {/* =================================================
            CABECERA
        ================================================= */}

        <header
          className="
            mx-auto
            mb-8
            max-w-4xl
            text-center
            lg:mb-10
          "
        >
          <div
            className="
              mb-4
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-[var(--primary)]/15
              bg-[var(--primary)]/8
              px-3
              py-1.5
              text-xs
              font-bold
              uppercase
              tracking-[0.14em]
              text-[var(--primary)]
            "
          >
            <span
              aria-hidden="true"
              className="
                size-1.5
                rounded-full
                bg-[var(--primary)]
                shadow-[0_0_0_4px]
                shadow-[var(--primary)]/10
              "
            />

            Marketplace B2B
          </div>

          <h1
            className="
              text-3xl
              font-black
              tracking-tight
              text-[var(--foreground)]
              sm:text-4xl
              lg:text-5xl
            "
          >
            Publica tu producto{' '}
            <span
              className="
                bg-linear-to-r
                from-brand-600
                to-cyan-500
                bg-clip-text
                text-transparent
              "
            >
              mayorista
            </span>
          </h1>

          <p
            className="
              mx-auto
              mt-4
              max-w-2xl
              text-sm
              leading-6
              text-[var(--muted)]
              sm:text-base
              sm:leading-7
            "
          >
            Presenta tus productos, define tus condiciones comerciales
            y conecta con compradores profesionales a través de Credi
            Marketplace.
          </p>
        </header>

        {/* =================================================
            FORMULARIO B2B
        ================================================= */}

        <section
          aria-labelledby="b2b-form-title"
          className="
            mx-auto
            w-full
            max-w-5xl
          "
        >
          <div
            className="
              rounded-3xl
              border
              border-[var(--border)]
              bg-[var(--surface)]
              p-1
              shadow-[0_24px_80px_rgba(0,0,0,0.08)]
              sm:p-2
            "
          >
            <div
              className="
                rounded-[1.35rem]
                border
                border-[var(--border)]/60
                bg-[var(--background)]
                p-4
                sm:p-6
                lg:p-8
              "
            >
              <h2
                id="b2b-form-title"
                className="sr-only"
              >
                Formulario para publicar producto mayorista
              </h2>

              <B2BProductForm />
            </div>
          </div>
        </section>

        {/* =================================================
            INFORMACIÓN INFERIOR
        ================================================= */}

        <footer
          className="
            mx-auto
            mt-8
            max-w-5xl
            text-center
          "
        >
          <p
            className="
              text-xs
              leading-5
              text-[var(--muted)]
            "
          >
            Publica información comercial clara y verificable para
            facilitar operaciones entre vendedores y compradores
            profesionales.
          </p>
        </footer>
      </div>
    </main>
  );
}
