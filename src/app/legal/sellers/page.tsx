import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Información para vendedores",
  description: "Requisitos de identificación y transparencia para vendedores de Credi Marketplace.",
};

export default function SellerLegalPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Vendedores</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Identificación y obligaciones del vendedor</h1>
        <div className="mt-8 space-y-7 text-sm leading-7 text-foreground">
          <section><h2 className="font-black">Identidad y condición profesional</h2><p>La cuenta de vendedor debe indicar la identidad comercial que resulte exigible, información de contacto y, cuando corresponda, si actúa como comerciante profesional o particular.</p></section>
          <section><h2 className="font-black">Publicaciones</h2><p>El vendedor debe proporcionar información exacta del producto, precio, disponibilidad, restricciones, entrega, garantías y devoluciones aplicables. La plataforma puede pedir documentación adicional para categorías reguladas.</p></section>
          <section><h2 className="font-black">Cumplimiento por producto</h2><p>La disponibilidad de un producto no significa que esté autorizado para todos los países. Antes de vender, deben verificarse restricciones de importación, licencias, etiquetado, seguridad y requisitos sectoriales del país de destino.</p></section>
          <section><h2 className="font-black">Verificación</h2><p>Credi Marketplace podrá aplicar controles de identidad, actividad comercial y prevención de fraude. La información privada de cumplimiento no se muestra públicamente salvo que la ley o la operación lo requieran.</p></section>
        </div>
      </article>
    </main>
  );
}
