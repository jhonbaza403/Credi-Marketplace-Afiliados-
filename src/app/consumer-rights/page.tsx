import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Derechos del consumidor",
  description: "Información previa a la compra, entregas, pagos, devoluciones y reclamaciones.",
};

export default function ConsumerRightsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Protección al consumidor</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Derechos del consumidor</h1>
        <div className="mt-8 space-y-7 text-sm leading-7 text-foreground">
          <section><h2 className="font-black">Información antes de comprar</h2><p>El usuario debe poder conocer las características principales, identidad del vendedor, precio total y cargos aplicables, restricciones de entrega, medios de pago, plazos y condiciones de cancelación o devolución cuando sean exigibles.</p></section>
          <section><h2 className="font-black">Pedido y pago</h2><p>El paso final debe indicar claramente cuándo la acción genera una obligación de pago. Los estados de pago se confirman en servidor y mediante el proveedor de pago correspondiente.</p></section>
          <section><h2 className="font-black">Entrega y devoluciones</h2><p>Las condiciones concretas se calculan por jurisdicción, producto y vendedor. Cuando exista un derecho legal de desistimiento o devolución, la interfaz deberá informar su alcance, plazo, procedimiento y excepciones.</p></section>
          <section><h2 className="font-black">Reclamaciones</h2><p>Cada pedido debe mantener un canal de soporte y un historial de incidencias. La plataforma debe conservar las evidencias necesarias para atender reclamaciones y obligaciones legales.</p></section>
          <section><h2 className="font-black">Marketplace</h2><p>Cuando la ley lo exija, el consumidor podrá conocer si está contratando con un comerciante profesional o con un particular y qué obligaciones corresponden al vendedor y a la plataforma.</p></section>
        </div>
        <p className="mt-10 rounded-2xl bg-muted p-4 text-xs leading-5 text-muted-foreground">En la Unión Europea, por ejemplo, las ventas a distancia tienen requisitos específicos de información, pago, entrega y desistimiento; los Estados miembros pueden añadir requisitos nacionales. La plataforma debe aplicar reglas más específicas cuando correspondan.</p>
      </article>
    </main>
  );
}
