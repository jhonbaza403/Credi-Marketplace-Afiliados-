// ==========================================================
// ARCHIVO: src/components/layout/Footer.tsx
// Credi Marketplace
//
// Pie de página global
//
// Next.js 16.3 · React 19.2 · TypeScript
// ==========================================================

import Link from 'next/link';



const footerLinks = [

  {
    title: 'Plataforma',
    links: [
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
    ],
  },


  {
    title: 'Cuenta',
    links: [
      {
        name: 'Perfil',
        href: '/profile',
      },
      {
        name: 'Pedidos',
        href: '/orders',
      },
      {
        name: 'Configuración',
        href: '/settings',
      },
    ],
  },


  {
    title: 'Legal',
    links: [
      {
        name: 'Privacidad',
        href: '/privacy',
      },
      {
        name: 'Términos',
        href: '/terms',
      },
    ],
  },

] as const;



export default function Footer() {


  return (

    <footer

      className="
        border-t
        bg-gray-50
      "

    >

      <div

        className="
          mx-auto
          grid
          max-w-7xl

          gap-8

          px-6
          py-10

          md:grid-cols-4
        "

      >


        {/* BRAND */}

        <div>

          <h2

            className="
              text-xl
              font-bold
              text-blue-600
            "

          >

            Credi Marketplace

          </h2>


          <p

            className="
              mt-3
              text-sm
              text-gray-600
            "

          >

            Plataforma global de comercio,
            afiliados, servicios B2B y pagos.

          </p>

        </div>



        {
          footerLinks.map(
            (section) => (

              <div

                key={section.title}

              >

                <h3

                  className="
                    mb-3
                    font-semibold
                    text-gray-900
                  "

                >

                  {section.title}

                </h3>


                <ul

                  className="
                    space-y-2
                  "

                >

                  {
                    section.links.map(
                      (link) => (

                        <li

                          key={link.href}

                        >

                          <Link

                            href={link.href}

                            className="
                              text-sm
                              text-gray-600

                              hover:text-blue-600
                            "

                          >

                            {link.name}

                          </Link>

                        </li>

                      )
                    )
                  }

                </ul>

              </div>

            )
          )
        }


      </div>



      <div

        className="
          border-t
          py-5

          text-center
          text-sm
          text-gray-500
        "

      >

        © {new Date().getFullYear()} Credi Marketplace.
        Todos los derechos reservados.

      </div>


    </footer>

  );

}
