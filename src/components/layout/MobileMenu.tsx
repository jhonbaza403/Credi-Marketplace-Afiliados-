// ==========================================================
// ARCHIVO: src/components/layout/MobileMenu.tsx
// Credi Marketplace
//
// Menú móvil responsive
// Next.js 16.3 · React 19.2 · TypeScript
// ==========================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';

interface MobileMenuItem {
  label: string;
  href: string;
}

const menuItems: readonly MobileMenuItem[] = [
  {
    label: 'Inicio',
    href: '/',
  },
  {
    label: 'Marketplace',
    href: '/marketplace',
  },
  {
    label: 'Productos',
    href: '/products',
  },
  {
    label: 'Afiliados',
    href: '/affiliate',
  },
  {
    label: 'B2B',
    href: '/b2b',
  },
  {
    label: 'Cuenta',
    href: '/account',
  },
] as const;


export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">

      {/* Botón menú */}
      <button
        type="button"
        aria-label="Abrir menú"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="
          inline-flex
          items-center
          justify-center
          rounded-md
          p-2
          text-gray-700
          hover:bg-gray-100
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
        "
      >
        <span className="sr-only">
          Abrir menú
        </span>

        {open ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M18 6L6 18"
            />

            <path
              d="M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M4 6h16"
            />

            <path
              d="M4 12h16"
            />

            <path
              d="M4 18h16"
            />
          </svg>
        )}
      </button>


      {/* Panel móvil */}
      {open && (
        <div
          className="
            absolute
            left-0
            right-0
            top-full
            z-50
            border-t
            bg-white
            shadow-lg
          "
        >

          <nav
            className="
              flex
              flex-col
              gap-2
              p-4
            "
          >

            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="
                  rounded-md
                  px-4
                  py-3
                  text-gray-700
                  transition
                  hover:bg-gray-100
                "
              >
                {item.label}
              </Link>
            ))}

          </nav>

        </div>
      )}

    </div>
  );
}
