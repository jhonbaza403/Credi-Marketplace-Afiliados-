import Image from 'next/image';
import Link from 'next/link';

const footerLinks = [
  {
    title: 'Plataforma',
    links: [
      { name: 'Marketplace', href: '/marketplace' },
      { name: 'Productos', href: '/products' },
      { name: 'Vendedores', href: '/sellers' },
      { name: 'Servicios', href: '/services' },
    ],
  },
  {
    title: 'Negocio',
    links: [
      { name: 'Afiliados', href: '/affiliate' },
      { name: 'B2B', href: '/b2b' },
      { name: 'Pedidos', href: '/orders' },
      { name: 'Cuenta', href: '/account' },
    ],
  },
  {
    title: 'Legal y seguridad',
    links: [
      { name: 'Centro Legal', href: '/legal' },
      { name: 'Privacidad', href: '/privacy' },
      { name: 'Cookies', href: '/cookies' },
      { name: 'Derechos del consumidor', href: '/consumer-rights' },
      { name: 'Seguridad', href: '/security' },
    ],
  },
  {
    title: 'Acceso',
    links: [
      { name: 'Iniciar sesión', href: '/login' },
      { name: 'Crear cuenta', href: '/register' },
      { name: 'Buscar', href: '/search' },
    ],
  },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-3" aria-label="Credi Marketplace - Inicio">
            <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <Image src="/logo.png" alt="Credi Marketplace" fill sizes="40px" className="object-contain p-1" />
            </span>
            <span className="font-extrabold text-slate-950">Credi Marketplace</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-600">
            Comercio, servicios, B2B, afiliados y operaciones digitales en una sola plataforma.
          </p>
        </div>

        {footerLinks.map((section) => (
          <div key={section.title}>
            <h3 className="mb-3 font-semibold text-slate-950">{section.title}</h3>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-600 transition hover:text-blue-600">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-500">
        © 2026 Credi Marketplace. Todos los derechos reservados.
      </div>
    </footer>
  );
}
