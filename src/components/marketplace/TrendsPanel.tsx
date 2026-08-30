// ==========================================================
// ARCHIVO: src/components/marketplace/TrendsPanel.tsx
// Credi Marketplace
//
// Panel de tendencias del Marketplace
//
// Next.js 16.3 · React 19.2 · TypeScript
// ==========================================================


interface TrendItem {

  id: string;

  title: string;

  category?: string;

  growth?: number;

  icon?: string;

}



interface TrendsPanelProps {

  trends: readonly TrendItem[];

}



export default function TrendsPanel({

  trends,

}: TrendsPanelProps) {


  if (trends.length === 0) {

    return (

      <section

        className="
          rounded-xl
          border
          bg-gray-50
          p-6

          text-center
          text-gray-500
        "

      >

        No hay tendencias disponibles.

      </section>

    );

  }



  return (

    <section

      className="
        rounded-xl

        border

        bg-white

        p-6

        shadow-sm
      "

    >


      <header

        className="
          mb-5
        "

      >

        <h2

          className="
            text-xl
            font-bold
            text-gray-900
          "

        >

          Tendencias actuales

        </h2>


        <p

          className="
            mt-1
            text-sm
            text-gray-600
          "

        >

          Productos y categorías con mayor crecimiento.

        </p>


      </header>



      <div

        className="
          grid

          gap-4

          sm:grid-cols-2

          lg:grid-cols-3
        "

      >

        {
          trends.map(
            (trend) => (

              <article

                key={trend.id}

                className="
                  rounded-lg

                  border

                  p-4

                  transition

                  hover:shadow-md
                "

              >

                <div

                  className="
                    flex

                    items-center

                    gap-3
                  "

                >

                  {
                    trend.icon && (

                      <span

                        className="
                          text-2xl
                        "

                      >

                        {trend.icon}

                      </span>

                    )
                  }


                  <h3

                    className="
                      font-semibold
                      text-gray-900
                    "

                  >

                    {trend.title}

                  </h3>


                </div>



                {
                  trend.category && (

                    <p

                      className="
                        mt-3

                        text-sm

                        text-gray-600
                      "

                    >

                      {trend.category}

                    </p>

                  )
                }



                {
                  typeof trend.growth === 'number' && (

                    <p

                      className="
                        mt-3

                        text-sm

                        font-medium

                        text-green-600
                      "

                    >

                      +{trend.growth}% crecimiento

                    </p>

                  )
                }


              </article>

            )
          )
        }


      </div>


    </section>

  );

}
