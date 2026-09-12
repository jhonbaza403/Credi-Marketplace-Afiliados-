import Image from 'next/image';
import Link from 'next/link';

const legalLinks = [
  { name: 'Centro Legal', href: '/legal' },
  { name: 'Privacidad', href: '/privacy' },
  { name: 'Cookies', href: '/cookies' },
  { name: 'Derechos del consumidor', href: '/consumer-rights' },
  { name: 'Seguridad', href: '/security' },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="Credi Marketplace - Inicio">
            <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <Image src="/logo.png" alt="Credi Marketplace" fill sizes="40px" className="object-contain p-1" />
            </span>
            <span className="font-extrabold text-slate-950">Credi Marketplace</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
            Comercio, servicios, B2B, afiliados y operaciones digitales en una sola plataforma.
          </p>
        </div>

        <div className="md:min-w-[24rem]">
          <h3 className="mb-4 font-semibold text-slate-950">Legal y seguridad</h3>
          <nav aria-label="Legal y seguridad">
            <ul className="flex flex-wrap gap-x-6 gap-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-600 transition hover:text-blue-600">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-500">
        © 2026 Credi Marketplace. Todos los derechos reservados.
      </div>
    </footer>
  );
}
