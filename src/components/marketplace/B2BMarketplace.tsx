// ==========================================================
// ARCHIVO: src/components/marketplace/B2BMarketplace.tsx
// Credi Marketplace
//
// B2B Marketplace Component
//
// Next.js 16
// React 19
// TypeScript
// ==========================================================

"use client";


import {
  Building2,
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
} from "lucide-react";




// ==========================================================
// TIPOS
// ==========================================================

interface B2BFeature {

  title: string;

  description: string;

  icon: React.ReactNode;

}





// ==========================================================
// DATA
// ==========================================================

const features: B2BFeature[] = [

  {
    title:
      "Compras Mayoristas",

    description:
      "Acceso a productos empresariales con condiciones comerciales para negocios.",

    icon:
      <ShoppingCart size={28}/>,
  },


  {
    title:
      "Proveedores Verificados",

    description:
      "Conecta empresas con proveedores y distribuidores dentro del ecosistema Credi.",

    icon:
      <Building2 size={28}/>,
  },


  {
    title:
      "Gestión Empresarial",

    description:
      "Administra pedidos, relaciones comerciales y operaciones B2B.",

    icon:
      <Package size={28}/>,
  },


  {
    title:
      "Red Comercial",

    description:
      "Construye relaciones con compradores, vendedores y aliados estratégicos.",

    icon:
      <Users size={28}/>,
  },

];





// ==========================================================
// COMPONENTE
// ==========================================================

export default function B2BMarketplace() {


  return (

    <section
      className="
        w-full
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-8
        shadow-sm
      "
    >


      <div
        className="
          mb-8
          flex
          items-center
          gap-3
        "
      >

        <TrendingUp
          className="text-blue-600"
          size={34}
        />


        <div>

          <h2
            className="
              text-2xl
              font-bold
              text-slate-900
            "
          >
            Credi B2B Marketplace
          </h2>


          <p
            className="
              text-sm
              text-slate-600
            "
          >
            Plataforma empresarial para comercio mayorista,
            proveedores y negocios digitales.
          </p>

        </div>


      </div>





      <div
        className="
          grid
          gap-6
          md:grid-cols-2
        "
      >


        {
          features.map(
            (feature) => (

              <article

                key={
                  feature.title
                }

                className="
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  p-6
                  transition
                  hover:shadow-md
                "

              >


                <div
                  className="
                    mb-4
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-xl
                    bg-blue-100
                    text-blue-700
                  "
                >

                  {feature.icon}

                </div>




                <h3
                  className="
                    mb-2
                    text-lg
                    font-semibold
                    text-slate-900
                  "
                >

                  {feature.title}

                </h3>




                <p
                  className="
                    text-sm
                    leading-6
                    text-slate-600
                  "
                >

                  {feature.description}

                </p>


              </article>

            )

          )
        }


      </div>



    </section>

  );

}
