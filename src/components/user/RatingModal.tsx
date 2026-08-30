'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

// ==========================================================
// ARCHIVO: src/components/Footer.tsx
// Credi Marketplace
//
// RESPONSABILIDADES:
// - Mostrar el pie de página institucional.
// - Proporcionar navegación secundaria.
// - Mostrar accesos para vendedores y afiliados.
// - Mostrar información de soporte.
// - Mantener coherencia con el sistema global de idiomas.
//
// PRINCIPIOS:
// - Sin textos de traducción duplicados cuando exista i18n.
// - Navegación declarativa.
// - Accesibilidad.
// - Consistencia de marca.
// - Compatible con Client Components.
// ==========================================================

// ==========================================================
// 1. CONFIGURACIÓN DE NAVEGACIÓN
// ==========================================================

interface FooterLink {
  readonly href: string;
  readonly label: string;
}

const exploreLinks: readonly FooterLink[] = [
  {
    href: '/products',
    label: 'Productos',
  },
  {
    href: '/magazines',
    label: 'Revistas Científicas',
  },
  {
    href: '/jobs',
    label: 'Bolsa de Empleo',
  },
];

const partnerLinks: readonly FooterLink[] = [
  {
    href: '/dashboard/affiliate',
    label: 'Panel de Afiliado',
  },
  {
    href: '/dashboard/seller',
    label: 'Portal de Vendedores',
  },
  {
    href: '/auth/register',
    label: 'Registrarme',
  },
];

// ==========================================================
// 2. COMPONENTE
// ==========================================================

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer
      id="contacto"
      className="
        mt-16
        border-t border-border
        bg-card
        text-card-foreground
      "
    >
      {/* ====================================================
          CONTENIDO PRINCIPAL
      ==================================================== */}

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">

          {/* ==================================================
              MARCA
          ================================================== */}

          <div>
            <Link
              href="/"
              className="
                inline-flex
                text-sm
                font-extrabold
                uppercase
                tracking-wider
                text-foreground
                transition-colors
                hover:text-primary
                focus:outline-none
                focus-visible:ring-2
                focus-visible:ring-primary
                focus-visible:ring-offset-2
                rounded-sm
              "
            >
              Credi Marketplace
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              Plataforma global de comercio electrónico, contenidos
              científicos, oportunidades laborales y soluciones de
              marketing de afiliados.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-emerald-500"
              />

              <span className="text-[11px] font-semibold text-muted-foreground">
                {t('subtitle')}
              </span>
            </div>
          </div>

          {/* ==================================================
              EXPLORAR
          ================================================== */}

          <nav aria-labelledby="footer-explore-title">
            <h2
              id="footer-explore-title"
              className="
                text-xs
                font-bold
                uppercase
                tracking-wider
                text-foreground
              "
            >
              Explorar
            </h2>

            <ul className="mt-4 space-y-3">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="
                      text-sm
                      text-muted-foreground
                      transition-colors
                      hover:text-primary
                      focus:outline-none
                      focus-visible:text-primary
                      focus-visible:underline
                    "
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* ==================================================
              AFILIADOS Y SOCIOS
          ================================================== */}

          <nav aria-labelledby="footer-partners-title">
            <h2
              id="footer-partners-title"
              className="
                text-xs
                font-bold
                uppercase
                tracking-wider
                text-foreground
              "
            >
              Afiliados y Socios
            </h2>

            <ul className="mt-4 space-y-3">
              {partnerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="
                      text-sm
                      text-muted-foreground
                      transition-colors
                      hover:text-primary
                      focus:outline-none
                      focus-visible:text-primary
                      focus-visible:underline
                    "
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* ==================================================
              SOPORTE
          ================================================== */}

          <section aria-labelledby="footer-support-title">
            <h2
              id="footer-support-title"
              className="
                text-xs
                font-bold
                uppercase
                tracking-wider
                text-foreground
              "
            >
              {t('support')}
            </h2>

            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              ¿Tienes dudas o necesitas ayuda con tu cuenta,
              compras, ventas o programa de afiliados?
            </p>

            <a
              href="mailto:soporte@credi-marketplace.com"
              className="
                mt-3
                inline-flex
                text-sm
                font-semibold
                text-primary
                transition-colors
                hover:underline
                focus:outline-none
                focus-visible:ring-2
                focus-visible:ring-primary
                focus-visible:ring-offset-2
                rounded-sm
              "
            >
              soporte@credi-marketplace.com
            </a>
          </section>
        </div>

        {/* ====================================================
            DIVISOR
        ==================================================== */}

        <div className="my-8 h-px bg-border" />

        {/* ====================================================
            COPYRIGHT + POLÍTICAS
        ==================================================== */}

        <div
          className="
            flex
            flex-col
            items-center
            justify-between
            gap-4
            text-center
            sm:flex-row
            sm:text-left
          "
        >
          <p className="text-xs text-muted-foreground">
            {t('rights')}
          </p>

          <nav
            aria-label="Información legal"
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          >
            <Link
              href="/terms"
              className="
                text-xs
                text-muted-foreground
                transition-colors
                hover:text-foreground
                hover:underline
                focus:outline-none
                focus-visible:text-foreground
                focus-visible:underline
              "
            >
              {t('terms')}
            </Link>

            <Link
              href="/privacy"
              className="
                text-xs
                text-muted-foreground
                transition-colors
                hover:text-foreground
                hover:underline
                focus:outline-none
                focus-visible:text-foreground
                focus-visible:underline
              "
            >
              {t('privacy')}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
