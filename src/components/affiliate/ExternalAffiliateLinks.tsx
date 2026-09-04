import { AFFILIATE_PROVIDERS } from "@/config/affiliate.config";

export function ExternalAffiliateLinks() {
  return (
    <section aria-labelledby="external-partners-title" className="space-y-4">
      <div>
        <h2 id="external-partners-title" className="text-xl font-bold text-gray-900">
          Compras con nuestros socios
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Estos enlaces llevan al sitio del proveedor. Los precios, disponibilidad,
          envío, devoluciones y condiciones de venta son gestionados por cada proveedor.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Object.values(AFFILIATE_PROVIDERS).map((provider) => (
          <article key={provider.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900">{provider.name}</h3>
            <p className="mt-2 text-xs text-gray-500">{provider.disclosure}</p>
            <a
              href={provider.url}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Visitar {provider.name}
            </a>
          </article>
        ))}
      </div>

      <p className="text-xs leading-5 text-gray-500">
        Al continuar, saldrás de Credi Marketplace y pasarás al sitio del proveedor.
        La comisión de un programa externo solo se genera cuando el proveedor reconoce
        la referencia conforme a sus propias reglas. Credi Marketplace no garantiza una
        comisión ni una atribución que el proveedor no haya aprobado.
      </p>
    </section>
  );
}
