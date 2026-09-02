import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Servicios | Credi Marketplace',
  description:
    'Servicios disponibles en Credi Marketplace para clientes y empresas.',
}

const services = [
  {
    title: 'Comercio',
    description: 'Accede a productos y soluciones ofrecidos en el marketplace.',
  },
  {
    title: 'Afiliados',
    description: 'Participa en oportunidades de afiliación y generación de ingresos.',
  },
  {
    title: 'B2B',
    description: 'Conecta con proveedores y gestiona compras empresariales.',
  },
  {
    title: 'Pagos',
    description: 'Prepara tus órdenes para integraciones de pago seguras.',
  },
] as const

export default function ServicesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide">
          Credi Marketplace
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Servicios
        </h1>
        <p className="mt-4 text-base leading-7 opacity-80">
          Explora las principales soluciones de comercio, afiliados, B2B y
          pagos disponibles en la plataforma.
        </p>
      </header>

      <section
        aria-labelledby="services-heading"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        <h2 id="services-heading" className="sr-only">
          Servicios disponibles
        </h2>

        {services.map((service) => (
          <article
            key={service.title}
            className="rounded-2xl border p-6 shadow-sm"
          >
            <h3 className="text-xl font-semibold">{service.title}</h3>
            <p className="mt-3 text-sm leading-6 opacity-80">
              {service.description}
            </p>
          </article>
        ))}
      </section>
    </main>
  )
}
