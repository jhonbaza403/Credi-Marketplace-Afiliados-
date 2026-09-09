import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description: "Uso y control de cookies y tecnologías similares en Credi Marketplace.",
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Cookies y tecnologías similares</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Política de Cookies</h1>
        <div className="mt-8 space-y-7 text-sm leading-7 text-foreground">
          <section><h2 className="font-black">Cookies necesarias</h2><p>Se utilizan para autenticación, seguridad, preferencias esenciales y funcionamiento de la plataforma. No se desactivan cuando son estrictamente necesarias para prestar el servicio solicitado.</p></section>
          <section><h2 className="font-black">Analítica y personalización</h2><p>Las tecnologías no esenciales se cargarán únicamente cuando exista la base jurídica o el consentimiento requerido en la jurisdicción correspondiente.</p></section>
          <section><h2 className="font-black">Publicidad</h2><p>La publicidad personalizada y el seguimiento de campañas se mantendrán separados de las cookies necesarias. Los usuarios dispondrán de mecanismos para retirar o modificar sus preferencias cuando la legislación aplicable lo requiera.</p></section>
          <section><h2 className="font-black">Preferencias</h2><p>Credi Marketplace debe conservar una señal de preferencia suficiente para respetar la decisión del usuario. En jurisdicciones que reconocen señales como Global Privacy Control, la integración debe respetar esa señal cuando sea jurídicamente aplicable.</p></section>
        </div>
        <p className="mt-10 rounded-2xl bg-muted p-4 text-xs leading-5 text-muted-foreground">Antes de activar proveedores de analítica, publicidad, píxeles o SDK de terceros, sus finalidades, transferencias y bases jurídicas deben incorporarse al inventario de tratamiento y al gestor de consentimiento.</p>
      </article>
    </main>
  );
}
