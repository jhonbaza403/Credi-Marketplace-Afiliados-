'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const navigation = [
  { name: 'Inicio', href: '/' },
  { name: 'Business OS', href: '/business-os' },
  { name: 'Marketplace', href: '/marketplace' },
  { name: 'Credi Chat', href: '/chat' },
  { name: 'Compras mayoristas', href: '/compras-mayoristas' },
  { name: 'Abastecimiento B2B', href: '/abastecimiento' },
  { name: 'Proveedores verificados', href: '/proveedores-verificados' },
  { name: 'Red Comercial', href: '/red-comercial' },
  { name: 'Gestión empresarial', href: '/gestion-empresarial' },
  { name: 'Inventario', href: '/inventario' },
  { name: 'Reputación', href: '/dashboard/reputation' },
  { name: 'Publicar producto', href: '/products/create' },
  { name: 'Afiliados', href: '/affiliate' },
  { name: 'Social', href: '/social' },
  { name: 'Servicios', href: '/services' },
  { name: 'Pedidos', href: '/orders' },
  { name: 'Mi cuenta', href: '/account' },
  { name: 'Seguridad', href: '/security' },
] as const;

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
      <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Credi Marketplace - Inicio">
        <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/95 shadow-sm">
          <Image src="/logo.png" alt="Credi Marketplace" fill sizes="44px" priority className="object-contain p-1" />
        </span>
        <span className="truncate text-base font-extrabold tracking-tight text-[var(--foreground)] sm:text-lg">Credi Marketplace</span>
      </Link>

      <div className="hidden items-center gap-4 lg:flex">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} className="text-sm font-semibold text-[var(--foreground)] transition-colors hover:text-[var(--primary)] focus-visible:outline-none focus-visible:text-[var(--primary)]">
            {item.name}
          </Link>
        ))}
      </div>

      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] shadow-sm lg:hidden" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open}>
        <span aria-hidden="true" className="text-xl leading-none">{open ? '×' : '☰'}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[100] w-full border-b border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--foreground)] shadow-xl lg:hidden">
          <div className="flex max-h-[75vh] flex-col gap-1 overflow-y-auto">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-secondary)] hover:text-[var(--primary)]">
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
