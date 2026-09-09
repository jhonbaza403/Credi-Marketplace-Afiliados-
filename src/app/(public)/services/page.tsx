import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Building2, CreditCard, Share2, ShoppingBag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Servicios | Credi Marketplace',
  description: 'Servicios de comercio, afiliados, B2B y operaciones de pago de Credi Marketplace.',
};

const services = [
  {
    title: 'Comercio',
    description: 'Explora el catálogo de productos y encuentra ofertas publicadas por vendedores.',
    href: '/marketplace',
    icon: ShoppingBag,
  },
  {
    title: 'Afiliados',
    description: 'Accede al programa de afiliados y comparte productos mediante enlaces rastreables.',
    href: '/affiliate',
    icon: Share2,
  },
  {
    title: 'B2B',
    description: 'Conecta con proveedores y gestiona oportunidades de compra empresarial.',
    href: '/b2b',
    icon: Building2,
  },
  {
    title: 'Pagos y pedidos',
    description: 'Consulta tus pedidos y continúa operaciones desde el flujo seguro de checkout.',
    href: '/orders',
    icon: CreditCard,
  },
] as const;

export default function ServicesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Credi Marketplace</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Servicios</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Entra directamente a cada solución sin enlaces rotos ni destinos inexistentes.
        </p>
      </header>

      <section aria-labelledby="services-heading" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <h2 id="services-heading" className="sr-only">Servicios disponibles</h2>
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <Link
              key={service.title}
              href={service.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Icon aria-hidden="true" className="size-6" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-950">{service.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{service.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-600 group-hover:gap-3">
                Abrir servicio
                <ArrowRight aria-hidden="true" className="size-4 transition-all" />
              </span>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
