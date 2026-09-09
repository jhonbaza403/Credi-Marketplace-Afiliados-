import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Publicidad y Afiliados",
  description: "Reglas de transparencia para publicidad, recomendaciones y enlaces de afiliación.",
};

export default function AdvertisingLegalPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Publicidad y afiliados</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Transparencia comercial</h1>
        <div className="mt-8 space-y-7 text-sm leading-7 text-foreground">
          <section><h2 className="font-black">Relaciones de afiliación</h2><p>Cuando un enlace o recomendación pueda generar una comisión para quien lo comparte, debe existir una divulgación clara y visible de esa relación comercial cuando la legislación aplicable lo exija.</p></section>
          <section><h2 className="font-black">Publicidad patrocinada</h2><p>Los anuncios patrocinados deben identificarse como publicidad. El contenido no debe presentarse como una recomendación independiente si existe una relación comercial que pueda afectar a esa percepción.</p></section>
          <section><h2 className="font-black">Prácticas prohibidas</h2><p>No se permiten declaraciones falsas, manipulación de reseñas, reseñas inventadas, suplantación, spam ni sistemas diseñados para ocultar una relación comercial relevante.</p></section>
          <section><h2 className="font-black">Viralización</h2><p>Las funciones de compartir pueden distribuir enlaces de productos por redes sociales y mensajería, pero no deben publicar automáticamente contenido en cuentas de terceros sin una acción o autorización válida del usuario.</p></section>
          <section><h2 className="font-black">Medición</h2><p>La atribución de afiliados debe utilizar identificadores limitados y controles de fraude. Los datos de seguimiento deben estar sujetos a las políticas de privacidad, cookies y jurisdicción correspondientes.</p></section>
        </div>
      </article>
    </main>
  );
}
