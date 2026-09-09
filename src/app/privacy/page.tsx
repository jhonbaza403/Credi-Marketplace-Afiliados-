import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Cómo Credi Marketplace trata los datos personales y gestiona los derechos de los usuarios.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Privacidad</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Política de Privacidad</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Credi Marketplace trata datos personales únicamente para finalidades legítimas, específicas y comunicadas al usuario, aplicando minimización, seguridad, control de acceso y conservación limitada.
        </p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-foreground">
          <section><h2 className="font-black">1. Datos que podemos tratar</h2><p>Datos de cuenta, contacto, pedidos, actividad necesaria para operar la plataforma, información de vendedores y datos de cumplimiento cuando resulten legalmente necesarios.</p></section>
          <section><h2 className="font-black">2. Finalidades</h2><p>Crear y proteger cuentas, procesar compras, gestionar vendedores y afiliados, prevenir fraude, atender reclamaciones, cumplir obligaciones legales y mejorar seguridad y funcionamiento.</p></section>
          <section><h2 className="font-black">3. Base jurídica</h2><p>La plataforma determinará la base aplicable según la jurisdicción y la finalidad, incluyendo ejecución contractual, obligación legal, interés legítimo o consentimiento cuando corresponda.</p></section>
          <section><h2 className="font-black">4. Derechos</h2><p>Se habilitan mecanismos para ejercer derechos de acceso, rectificación, eliminación, oposición, limitación, portabilidad y retiro del consentimiento cuando sean exigibles por la legislación aplicable.</p></section>
          <section><h2 className="font-black">5. Transferencias internacionales</h2><p>Cuando los datos salgan de la jurisdicción de origen, Credi Marketplace aplicará el mecanismo de transferencia exigido por la ley correspondiente y documentará las salvaguardas adecuadas.</p></section>
          <section><h2 className="font-black">6. Seguridad</h2><p>Las cuentas usan autenticación y controles de autorización. Los datos privados se protegen con controles de acceso y políticas RLS en Supabase. Las credenciales secretas no se exponen en el cliente.</p></section>
          <section><h2 className="font-black">7. Retención</h2><p>Los datos se conservan durante el tiempo necesario para la finalidad correspondiente y durante los plazos legales o de defensa de reclamaciones que resulten aplicables; después se eliminan o anonimizan cuando sea posible.</p></section>
          <section><h2 className="font-black">8. Solicitudes y contacto</h2><p>El canal de privacidad de la plataforma debe publicarse con una dirección de contacto operativa antes de la apertura comercial en cada jurisdicción.</p></section>
        </div>

        <p className="mt-10 rounded-2xl bg-muted p-4 text-xs leading-5 text-muted-foreground">
          Esta política es una base técnica y operativa. La versión legal definitiva debe identificar al responsable del tratamiento, domicilios, autoridades competentes, plazos y mecanismos locales antes de operar comercialmente en cada país.
        </p>
      </article>
    </main>
  );
}
