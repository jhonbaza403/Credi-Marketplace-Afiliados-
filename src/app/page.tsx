// ==========================================================
// ARCHIVO: src/app/page.tsx
// Credi Marketplace — Landing Page Principal
//
// Next.js 16.3
// React 19
// React Compiler
// Server Component
//
// NIVEL:
// - Premium UI/UX
// - Responsive
// - Accesibilidad
// - SEO semántico
// - Sin lógica de cliente innecesaria
// - Compatible con Tailwind CSS
// ==========================================================

import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Globe2,
  LockKeyhole,
  Rocket,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
} from 'lucide-react';

// ==========================================================
// TIPOS
// ==========================================================

interface Feature {
  readonly title: string;
  readonly description: string;
  readonly icon: ReactNode;
  readonly iconClassName: string;
  readonly iconBackgroundClassName: string;
}

interface NavigationColumn {
  readonly title: string;
  readonly links: ReadonlyArray<{
    readonly href: string;
    readonly label: string;
  }>;
}

interface HeroMetricProps {
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: string;
}

// ==========================================================
// DATOS ESTÁTICOS
// ==========================================================

const CURRENT_YEAR = 2026;

const features: ReadonlyArray<Feature> = [
  {
    title: 'Comercio seguro',
    description:
      'Una infraestructura digital diseñada para facilitar operaciones comerciales mediante controles de acceso, protección de datos y procesos estructurados.',
    icon: <LockKeyhole aria-hidden="true" className="size-7" />,
    iconClassName:
      'text-brand-600 dark:text-brand-400',
    iconBackgroundClassName:
      'bg-brand-100 ring-brand-500/20 dark:bg-brand-950 dark:ring-brand-400/20',
  },
  {
    title: 'Alcance internacional',
    description:
      'Conecta compradores, vendedores, profesionales, proveedores y empresas para desarrollar oportunidades comerciales más allá de las fronteras.',
    icon: <Globe2 aria-hidden="true" className="size-7" />,
    iconClassName:
      'text-cyan-600 dark:text-cyan-400',
    iconBackgroundClassName:
      'bg-cyan-100 ring-cyan-500/20 dark:bg-cyan-950 dark:ring-cyan-400/20',
  },
  {
    title: 'B2B y B2C',
    description:
      'Una plataforma preparada para comercio minorista, operaciones mayoristas y relaciones comerciales entre empresas.',
    icon: <Building2 aria-hidden="true" className="size-7" />,
    iconClassName:
      'text-indigo-600 dark:text-indigo-400',
    iconBackgroundClassName:
      'bg-indigo-100 ring-indigo-500/20 dark:bg-indigo-950 dark:ring-indigo-400/20',
  },
];

const ecosystemItems = [
  {
    label: 'Comunidad',
    value: 'Global',
    icon: <Users aria-hidden="true" className="size-5" />,
  },
  {
    label: 'Modelo',
    value: 'B2C',
    icon: <ShoppingBag aria-hidden="true" className="size-5" />,
  },
  {
    label: 'Empresas',
    value: 'B2B',
    icon: <Building2 aria-hidden="true" className="size-5" />,
  },
  {
    label: 'Comercio',
    value: 'Digital',
    icon: <Store aria-hidden="true" className="size-5" />,
  },
] as const;

const navigationColumns: ReadonlyArray<NavigationColumn> = [
  {
    title: 'Navegación',
    links: [
      {
        href: '/marketplace',
        label: 'Explorar',
      },
      {
        href: '/marketplace',
        label: 'Ofertas',
      },
      {
        href: '/productos',
        label: 'Productos',
      },
      {
        href: '/servicios',
        label: 'Servicios',
      },
    ],
  },
  {
    title: 'Comercio',
    links: [
      {
        href: '/dashboard/seller',
        label: 'Vender en Credi',
      },
      {
        href: '/marketplace',
        label: 'Categorías',
      },
      {
        href: '/b2b',
        label: 'Portal B2B',
      },
    ],
  },
  {
    title: 'Cuenta',
    links: [
      {
        href: '/login',
        label: 'Ingresar',
      },
      {
        href: '/register',
        label: 'Crear cuenta',
      },
      {
        href: '/marketplace',
        label: 'Centro de ayuda',
      },
    ],
  },
];

// ==========================================================
// COMPONENTE PRINCIPAL
// ==========================================================

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* ======================================================
          HERO
      ======================================================= */}

      <section
        aria-labelledby="hero-title"
        className="
          relative
          isolate
          overflow-hidden
          bg-neutral-950
          text-white
        "
      >
        {/* Fondo atmosférico */}

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            -z-10
            overflow-hidden
          "
        >
          <div
            className="
              absolute
              -left-40
              -top-40
              size-[30rem]
              rounded-full
              bg-brand-600/20
              blur-[120px]
            "
          />

          <div
            className="
              absolute
              -right-40
              top-1/2
              size-[32rem]
              -translate-y-1/2
              rounded-full
              bg-cyan-500/10
              blur-[130px]
            "
          />

          <div
            className="
              absolute
              bottom-[-15rem]
              left-1/3
              size-[28rem]
              rounded-full
              bg-indigo-600/10
              blur-[120px]
            "
          />

          <div
            className="
              absolute
              inset-0
              bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.045),transparent_55%)]
            "
          />

          <div
            className="
              absolute
              inset-0
              opacity-[0.025]
              [background-image:linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)]
              [background-size:64px_64px]
            "
          />
        </div>

        <div
          className="
            container-marketplace
            relative
            py-20
            sm:py-28
            lg:py-36
          "
        >
          <div className="mx-auto max-w-5xl text-center">
            {/* Badge */}

            <div
              className="
                mb-7
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-brand-400/20
                bg-brand-400/10
                px-4
                py-2
                text-xs
                font-bold
                uppercase
                tracking-[0.16em]
                text-brand-200
                shadow-lg
                shadow-brand-950/20
                backdrop-blur-md
              "
            >
              <span
                aria-hidden="true"
                className="relative flex size-2"
              >
                <span
                  className="
                    absolute
                    inline-flex
                    size-full
                    animate-ping
                    rounded-full
                    bg-brand-400
                    opacity-75
                  "
                />

                <span
                  className="
                    relative
                    inline-flex
                    size-2
                    rounded-full
                    bg-brand-400
                  "
                />
              </span>

              Plataforma comercial B2B &amp; B2C
            </div>

            {/* Título */}

            <h1
              id="hero-title"
              className="
                text-balance
                text-4xl
                font-black
                leading-[1.05]
                tracking-[-0.04em]
                text-white
                sm:text-6xl
                lg:text-7xl
              "
            >
              El ecosistema digital para{' '}
              <span
                className="
                  bg-linear-to-r
                  from-brand-300
                  via-cyan-300
                  to-cyan-400
                  bg-clip-text
                  text-transparent
                "
              >
                crecer sin límites
              </span>
            </h1>

            {/* Descripción */}

            <p
              className="
                mx-auto
                mt-7
                max-w-3xl
                text-pretty
                text-base
                leading-7
                text-neutral-300
                sm:text-lg
                sm:leading-8
                lg:text-xl
              "
            >
              Compra, vende y desarrolla oportunidades comerciales
              en Credi Marketplace. Una plataforma diseñada para
              conectar personas, profesionales, empresas,
              proveedores y compradores en un mismo ecosistema.
            </p>

            {/* CTAs */}

            <div
              className="
                mt-10
                flex
                flex-col
                items-stretch
                justify-center
                gap-3
                sm:flex-row
                sm:items-center
                sm:gap-4
              "
            >
              <Link
                href="/explorar"
                className="
                  group
                  inline-flex
                  min-h-12
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-brand-600
                  px-7
                  py-3.5
                  text-sm
                  font-black
                  text-white
                  shadow-xl
                  shadow-brand-950/40
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-brand-500
                  hover:shadow-2xl
                  focus-visible:outline-2
                  focus-visible:outline-offset-4
                  focus-visible:outline-brand-300
                  active:translate-y-0
                "
              >
                Explorar mercado

                <ArrowRight
                  aria-hidden="true"
                  className="
                    size-5
                    transition-transform
                    duration-200
                    group-hover:translate-x-1
                  "
                />
              </Link>

              <Link
                href="/vender"
                className="
                  inline-flex
                  min-h-12
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-white/15
                  bg-white/5
                  px-7
                  py-3.5
                  text-sm
                  font-black
                  text-white
                  backdrop-blur-md
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:border-white/25
                  hover:bg-white/10
                  focus-visible:outline-2
                  focus-visible:outline-offset-4
                  focus-visible:outline-white
                  active:translate-y-0
                "
              >
                Empieza a vender

                <ChevronRight
                  aria-hidden="true"
                  className="size-4"
                />
              </Link>
            </div>
          </div>

          {/* Indicadores */}

          <div
            className="
              mx-auto
              mt-16
              grid
              max-w-5xl
              grid-cols-2
              gap-3
              sm:mt-20
              sm:grid-cols-4
              sm:gap-4
            "
          >
            {ecosystemItems.map((item) => (
              <HeroMetric
                key={item.label}
                icon={item.icon}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          PROPUESTA DE VALOR
      ======================================================= */}

      <section
        aria-labelledby="features-title"
        className="
          bg-[var(--background)]
          py-20
          sm:py-28
        "
      >
        <div className="container-marketplace">
          {/* Encabezado */}

          <div className="mx-auto max-w-3xl text-center">
            <div
              className="
                mb-5
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-brand-500/10
                bg-brand-50
                px-3
                py-1.5
                text-xs
                font-bold
                text-brand-700
                dark:bg-brand-950
                dark:text-brand-300
              "
            >
              <Sparkles
                aria-hidden="true"
                className="size-4"
              />

              Una nueva forma de hacer negocios
            </div>

            <h2
              id="features-title"
              className="
                text-balance
                text-3xl
                font-black
                leading-tight
                tracking-[-0.03em]
                text-[var(--foreground)]
                sm:text-4xl
                lg:text-5xl
              "
            >
              Todo lo necesario para construir tu próximo negocio
            </h2>

            <p
              className="
                mt-5
                text-pretty
                text-base
                leading-7
                text-[var(--muted)]
                sm:text-lg
                sm:leading-8
              "
            >
              Credi Marketplace integra herramientas para descubrir
              productos, comercializar, conectar con proveedores y
              desarrollar nuevas oportunidades.
            </p>
          </div>

          {/* Tarjetas */}

          <div
            className="
              mx-auto
              mt-14
              grid
              max-w-6xl
              gap-5
              md:grid-cols-3
              lg:mt-16
            "
          >
            {features.map((feature) => (
              <article
                key={feature.title}
                className="
                  marketplace-card
                  group
                  relative
                  overflow-hidden
                  p-7
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:shadow-marketplace-xl
                "
              >
                {/* Decoración */}

                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    -right-16
                    -top-16
                    size-32
                    rounded-full
                    bg-brand-500/5
                    blur-2xl
                    transition-transform
                    duration-500
                    group-hover:scale-150
                  "
                />

                <div
                  className={`
                    relative
                    mb-6
                    flex
                    size-14
                    items-center
                    justify-center
                    rounded-2xl
                    ring-1
                    transition-transform
                    duration-300
                    group-hover:scale-105
                    ${feature.iconBackgroundClassName}
                    ${feature.iconClassName}
                  `}
                >
                  {feature.icon}
                </div>

                <h3
                  className="
                    relative
                    text-xl
                    font-black
                    tracking-tight
                    text-[var(--foreground)]
                  "
                >
                  {feature.title}
                </h3>

                <p
                  className="
                    relative
                    mt-3
                    text-sm
                    leading-7
                    text-[var(--muted)]
                  "
                >
                  {feature.description}
                </p>

                <div
                  className="
                    mt-6
                    flex
                    items-center
                    gap-1.5
                    text-xs
                    font-bold
                    text-brand-600
                    dark:text-brand-400
                  "
                >
                  Diseñado para crecer

                  <ArrowRight
                    aria-hidden="true"
                    className="
                      size-3.5
                      transition-transform
                      group-hover:translate-x-1
                    "
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          SECCIÓN ECOSISTEMA
      ======================================================= */}

      <section
        aria-labelledby="ecosystem-title"
        className="
          border-y
          border-[var(--border)]
          bg-[var(--surface)]
          py-20
          sm:py-24
        "
      >
        <div className="container-marketplace">
          <div
            className="
              grid
              items-center
              gap-10
              lg:grid-cols-[1.1fr_0.9fr]
              lg:gap-16
            "
          >
            {/* Texto */}

            <div>
              <div
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  bg-[var(--background)]
                  px-3
                  py-1.5
                  text-xs
                  font-bold
                  text-brand-600
                  dark:text-brand-400
                "
              >
                <Rocket
                  aria-hidden="true"
                  className="size-4"
                />

                Ecosistema Credi
              </div>

              <h2
                id="ecosystem-title"
                className="
                  mt-5
                  max-w-2xl
                  text-balance
                  text-3xl
                  font-black
                  leading-tight
                  tracking-[-0.03em]
                  text-[var(--foreground)]
                  sm:text-4xl
                "
              >
                Una plataforma construida para conectar oportunidades
              </h2>

              <p
                className="
                  mt-5
                  max-w-2xl
                  text-pretty
                  leading-7
                  text-[var(--muted)]
                "
              >
                Desde una compra individual hasta una relación
                comercial entre empresas, Credi Marketplace busca
                centralizar las herramientas necesarias para descubrir,
                conectar y desarrollar negocios.
              </p>

              <div className="mt-7">
                <Link
                  href="/explorar"
                  className="
                    group
                    inline-flex
                    items-center
                    gap-2
                    text-sm
                    font-black
                    text-brand-600
                    transition-colors
                    hover:text-brand-500
                    dark:text-brand-400
                  "
                >
                  Descubrir el marketplace

                  <ArrowRight
                    aria-hidden="true"
                    className="
                      size-4
                      transition-transform
                      group-hover:translate-x-1
                    "
                  />
                </Link>
              </div>
            </div>

            {/* Beneficios */}

            <div
              className="
                rounded-3xl
                border
                border-[var(--border)]
                bg-[var(--background)]
                p-6
                shadow-marketplace
                sm:p-8
              "
            >
              <div className="space-y-5">
                <BenefitItem>
                  Conecta compradores y vendedores.
                </BenefitItem>

                <BenefitItem>
                  Descubre productos y servicios.
                </BenefitItem>

                <BenefitItem>
                  Accede a oportunidades B2B.
                </BenefitItem>

                <BenefitItem>
                  Desarrolla relaciones comerciales.
                </BenefitItem>

                <BenefitItem>
                  Gestiona tu presencia dentro del ecosistema.
                </BenefitItem>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          CTA PRINCIPAL
      ======================================================= */}

      <section
        aria-labelledby="cta-title"
        className="
          px-4
          pb-20
          pt-20
          sm:px-6
          sm:pb-28
          sm:pt-24
        "
      >
        <div
          className="
            container-marketplace
            overflow-hidden
            rounded-[2rem]
            bg-neutral-950
            text-white
            shadow-marketplace-xl
          "
        >
          <div
            className="
              relative
              isolate
              overflow-hidden
              px-6
              py-16
              text-center
              sm:px-12
              sm:py-24
            "
          >
            {/* Glows */}

            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -right-40
                -top-40
                -z-10
                size-[30rem]
                rounded-full
                bg-brand-600/20
                blur-[120px]
              "
            />

            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -bottom-40
                -left-40
                -z-10
                size-[30rem]
                rounded-full
                bg-cyan-500/10
                blur-[120px]
              "
            />

            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                inset-0
                -z-10
                bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_60%)]
              "
            />

            <div
              className="
                mx-auto
                flex
                size-14
                items-center
                justify-center
                rounded-2xl
                border
                border-brand-400/20
                bg-brand-400/10
                text-brand-300
              "
            >
              <Rocket
                aria-hidden="true"
                className="size-7"
              />
            </div>

            <h2
              id="cta-title"
              className="
                mx-auto
                mt-7
                max-w-3xl
                text-balance
                text-3xl
                font-black
                leading-tight
                tracking-[-0.03em]
                sm:text-5xl
              "
            >
              ¿Listo para dar el siguiente paso?
            </h2>

            <p
              className="
                mx-auto
                mt-6
                max-w-2xl
                text-pretty
                text-base
                leading-7
                text-neutral-300
                sm:text-lg
                sm:leading-8
              "
            >
              Crea tu cuenta y comienza a explorar nuevas
              oportunidades comerciales dentro del ecosistema
              Credi Marketplace.
            </p>

            <div
              className="
                mt-9
                flex
                flex-col
                justify-center
                gap-3
                sm:flex-row
                sm:gap-4
              "
            >
              <Link
                href="/registro"
                className="
                  inline-flex
                  min-h-12
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-brand-600
                  px-8
                  py-3.5
                  text-sm
                  font-black
                  text-white
                  shadow-lg
                  shadow-brand-950/30
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-brand-500
                  hover:shadow-xl
                  focus-visible:outline-2
                  focus-visible:outline-offset-4
                  focus-visible:outline-brand-300
                "
              >
                Crear cuenta gratis

                <ArrowRight
                  aria-hidden="true"
                  className="size-4"
                />
              </Link>

              <Link
                href="/contacto"
                className="
                  inline-flex
                  min-h-12
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-white/15
                  bg-white/5
                  px-8
                  py-3.5
                  text-sm
                  font-black
                  text-white
                  backdrop-blur
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:border-white/25
                  hover:bg-white/10
                  focus-visible:outline-2
                  focus-visible:outline-offset-4
                  focus-visible:outline-white
                "
              >
                Hablar con un asesor

                <ChevronRight
                  aria-hidden="true"
                  className="size-4"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          FOOTER
      ======================================================= */}

      <footer
        className="
          border-t
          border-[var(--border)]
          bg-[var(--surface)]
        "
      >
        <div className="container-marketplace py-14 sm:py-16">
          <div
            className="
              grid
              gap-10
              sm:grid-cols-2
              lg:grid-cols-5
              lg:gap-12
            "
          >
            {/* Marca */}

            <div
              className="
                sm:col-span-2
                lg:col-span-2
                lg:pr-12
              "
            >
              <Link
                href="/"
                aria-label="Credi Marketplace — Inicio"
                className="
                  inline-flex
                  text-2xl
                  font-black
                  tracking-tight
                  text-[var(--foreground)]
                  transition-opacity
                  hover:opacity-80
                "
              >
                Credi
                <span className="text-brand-600 dark:text-brand-400">
                  Marketplace
                </span>
              </Link>

              <p
                className="
                  mt-4
                  max-w-md
                  text-sm
                  leading-6
                  text-[var(--muted)]
                "
              >
                Un ecosistema digital para conectar compradores,
                vendedores, profesionales, proveedores y empresas.
              </p>

              <div
                className="
                  mt-6
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-[var(--border)]
                  bg-[var(--background)]
                  px-3
                  py-1.5
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-[var(--muted)]
                "
              >
                <span
                  className="
                    size-1.5
                    rounded-full
                    bg-emerald-500
                  "
                  aria-hidden="true"
                />

                Ecosistema digital
              </div>
            </div>

            {/* Navegación */}

            {navigationColumns.map((column) => (
              <nav
                key={column.title}
                aria-label={column.title}
              >
                <h2
                  className="
                    text-xs
                    font-black
                    uppercase
                    tracking-[0.12em]
                    text-[var(--foreground)]
                  "
                >
                  {column.title}
                </h2>

                <ul className="mt-5 space-y-3.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="
                          inline-flex
                          items-center
                          text-sm
                          text-[var(--muted)]
                          transition-all
                          duration-200
                          hover:translate-x-0.5
                          hover:text-brand-600
                          dark:hover:text-brand-400
                          focus-visible:outline-2
                          focus-visible:outline-offset-2
                          focus-visible:outline-brand-500
                        "
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {/* Línea inferior */}

          <div
            className="
              mt-14
              flex
              flex-col
              gap-5
              border-t
              border-[var(--border)]
              pt-7
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <p
              className="
                text-xs
                leading-5
                text-[var(--muted)]
                sm:text-sm
              "
            >
              © {CURRENT_YEAR} Credi Marketplace. Todos los
              derechos reservados.
            </p>

            <nav
              aria-label="Legal"
              className="flex flex-wrap gap-x-6 gap-y-2"
            >
              <Link
                href="/privacidad"
                className="
                  text-xs
                  text-[var(--muted)]
                  transition-colors
                  hover:text-[var(--foreground)]
                  sm:text-sm
                "
              >
                Privacidad
              </Link>

              <Link
                href="/terminos"
                className="
                  text-xs
                  text-[var(--muted)]
                  transition-colors
                  hover:text-[var(--foreground)]
                  sm:text-sm
                "
              >
                Términos
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ==========================================================
// HERO METRIC
// ==========================================================

function HeroMetric({
  icon,
  label,
  value,
}: HeroMetricProps) {
  return (
    <div
      className="
        group
        rounded-2xl
        border
        border-white/10
        bg-white/5
        p-4
        text-center
        shadow-lg
        shadow-black/10
        backdrop-blur-md
        transition-all
        duration-300
        hover:-translate-y-0.5
        hover:border-white/15
        hover:bg-white/10
      "
    >
      <div
        className="
          mx-auto
          flex
          size-9
          items-center
          justify-center
          rounded-xl
          bg-white/10
          text-brand-300
          transition-transform
          duration-300
          group-hover:scale-105
        "
      >
        {icon}
      </div>

      <p
        className="
          mt-3
          text-[10px]
          font-bold
          uppercase
          tracking-[0.12em]
          text-neutral-400
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          text-base
          font-black
          text-white
          sm:text-lg
        "
      >
        {value}
      </p>
    </div>
  );
}

// ==========================================================
// BENEFIT ITEM
// ==========================================================

interface BenefitItemProps {
  readonly children: ReactNode;
}

function BenefitItem({
  children,
}: BenefitItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="
          mt-0.5
          flex
          size-6
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-emerald-500/10
          text-emerald-600
          dark:text-emerald-400
        "
        aria-hidden="true"
      >
        <Check className="size-3.5" />
      </div>

      <p
        className="
          text-sm
          font-semibold
          leading-6
          text-[var(--foreground)]
        "
      >
        {children}
      </p>
    </div>
  );
}
