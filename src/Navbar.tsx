// ==========================================================
// ARCHIVO: src/components/layout/Navbar.tsx
// Credi Marketplace
//
// Barra de navegación principal
//
// Next.js 16.3 · React 19.2 · TypeScript
// ==========================================================

'use client';


import Link from 'next/link';

import {
  useState,
} from 'react';



const navigation = [

  {
    name: 'Inicio',
    href: '/',
  },

  {
    name: 'Marketplace',
    href: '/marketplace',
  },

  {
    name: 'Vendedores',
    href: '/seller',
  },

  {
    name: 'Afiliados',
    href: '/affiliate',
  },

  {
    name: 'Pedidos',
    href: '/orders',
  },

] as const;



export default function Navbar() {


  const [
    open,
    setOpen,
  ] = useState(false);



  return (

    <nav

      className="
        mx-auto
        flex
        max-w-7xl
        items-center
        justify-between

        px-6
        py-4
      "

    >


      {/* LOGO */}

      <Link

        href="/"

        className="
          text-xl
          font-bold
          text-blue-600
        "

      >

        Credi Marketplace

      </Link>



      {/* DESKTOP MENU */}

      <div

        className="
          hidden
          items-center
          gap-6

          md:flex
        "

      >

        {
          navigation.map(
            (item) => (

              <Link

                key={item.href}

                href={item.href}

                className="
                  text-sm
                  font-medium
                  text-gray-700

                  hover:text-blue-600
                "

              >

                {item.name}

              </Link>

            )
          )
        }


      </div>



      {/* MOBILE BUTTON */}

      <button

        type="button"

        onClick={() =>
          setOpen(!open)
        }

        className="
          rounded-lg
          border
          px-3
          py-2

          md:hidden
        "

        aria-label="Abrir menú"

      >

        ☰

      </button>



      {/* MOBILE MENU */}

      {
        open && (

          <div

            className="
              absolute
              left-0
              top-full

              w-full

              border-b
              bg-white

              p-6

              md:hidden
            "

          >

            <div

              className="
                flex
                flex-col
                gap-4
              "

            >

              {
                navigation.map(
                  (item) => (

                    <Link

                      key={item.href}

                      href={item.href}

                      onClick={() =>
                        setOpen(false)
                      }

                      className="
                        text-gray-700
                        hover:text-blue-600
                      "

                    >

                      {item.name}

                    </Link>

                  )
                )
              }

            </div>

          </div>

        )
      }


    </nav>

  );

}
