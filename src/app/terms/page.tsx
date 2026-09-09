import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: "Términos de uso de Credi Marketplace para compradores, vendedores y afiliados.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Condiciones de uso</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Términos y Condiciones</h1>
        <div className="mt-8 space-y-7 text-sm leading-7 text-foreground">
          <section><h2 className="font-black">1. Cuenta</h2><p>Cada cuenta es individual. El usuario debe proporcionar información veraz y mantener seguros sus factores de autenticación. Las operaciones sujetas a capacidad legal solo podrán realizarse cuando el usuario cumpla los requisitos aplicables en su jurisdicción.</p></section>
          <section><h2 className="font-black">2. Marketplace</h2><p>Credi Marketplace facilita la relación digital entre compradores y vendedores. La identidad y condición profesional del vendedor deben mostrarse cuando la ley lo exija. Las obligaciones sobre producto, entrega, impuestos, garantías y devoluciones se asignan conforme a la legislación aplicable y a la información del anuncio.</p></section>
          <section><h2 className="font-black">3. Productos prohibidos</h2><p>La plataforma podrá bloquear categorías, publicaciones, vendedores o campañas cuando sean ilícitos, inseguros, regulados, falsificados, fraudulentos o incompatibles con la jurisdicción de destino.</p></section>
          <section><h2 className="font-black">4. Afiliados y publicidad</h2><p>Los afiliados deben revelar de forma clara sus relaciones comerciales cuando sea exigible. No se permite publicidad engañosa, suplantación, spam ni manipulación fraudulenta del tráfico o de las atribuciones.</p></section>
          <section><h2 className="font-black">5. Pagos y pedidos</h2><p>La plataforma registra estados de pedido de forma controlada en servidor. Ningún cliente puede declarar por sí mismo que un pago fue confirmado. Los reembolsos, cancelaciones, garantías y derechos de desistimiento se gestionan según el país y el tipo de operación.</p></section>
          <section><h2 className="font-black">6. Moderación</h2><p>Podemos retirar contenido o limitar cuentas para cumplir la ley, prevenir fraude, proteger a usuarios o aplicar reglas de la plataforma. Se habilitarán mecanismos de reclamación y revisión cuando sean legalmente exigibles.</p></section>
        </div>
        <p className="mt-10 rounded-2xl bg-muted p-4 text-xs leading-5 text-muted-foreground">Estos términos son una base operativa. Antes de operar comercialmente en una jurisdicción deben completarse con la entidad responsable, domicilio, ley aplicable, resolución de disputas y requisitos sectoriales locales.</p>
      </article>
    </main>
  );
}
