import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Centro de Atención y Calidad | Credi Marketplace",
  robots: { index: false, follow: false },
};

const workstreams = [
  {
    title: "Atención al usuario",
    description: "Casos de acceso, pedidos, pagos, publicaciones, chat y afiliación.",
    status: "Módulo en preparación",
  },
  {
    title: "Recomendaciones",
    description: "Ideas y propuestas de usuarios con evaluación, votos y estado de entrega.",
    status: "Módulo en preparación",
  },
  {
    title: "Incidencias técnicas",
    description: "Errores reproducibles, impacto, responsable, evidencia y vínculo con una corrección.",
    status: "Módulo en preparación",
  },
  {
    title: "Supervisor de calidad GPT",
    description: "Resume señales y propone causas o pruebas; no ejecuta cambios críticos ni publica.",
    status: "Integración pendiente",
  },
];

const lifecycle = [
  ["01", "Recibido", "Se registra el reporte y se genera una referencia."],
  ["02", "Clasificado", "Se define categoría, prioridad, impacto y privacidad."],
  ["03", "Asignado", "Soporte o equipo técnico asume la responsabilidad."],
  ["04", "En resolución", "Se documentan respuestas, evidencias y acciones."],
  ["05", "En verificación", "Se prueban la solución y los posibles efectos secundarios."],
  ["06", "Resuelto", "Se comunica el resultado; el usuario puede reabrir si persiste."],
];

export default async function AdminQualityCenterPage() {
  await requireAdmin();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">Administración · Calidad</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Centro de Atención y Mejora Continua
        </h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Un punto central para conectar los problemas de los usuarios, las recomendaciones,
          las incidencias técnicas y la supervisión de calidad de Credi Marketplace.
        </p>
      </header>

      <section aria-labelledby="status-heading" className="mb-8 rounded-2xl border border-border bg-card p-5">
        <h2 id="status-heading" className="font-bold text-foreground">Estado de esta primera etapa</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          La vista administrativa está creada y protegida por rol. Las métricas, los tickets y las
          recomendaciones todavía no están conectados a tablas operativas; por eso no se muestran
          cifras ficticias ni se afirma que el monitoreo ya esté activo.
        </p>
      </section>

      <section aria-labelledby="areas-heading" className="mb-10">
        <h2 id="areas-heading" className="mb-4 text-xl font-bold text-foreground">Áreas conectadas en el flujo de trabajo</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {workstreams.map((item) => (
            <article key={item.title} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-bold text-foreground">{item.title}</h3>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {item.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="flow-heading" className="mb-10">
        <h2 id="flow-heading" className="mb-4 text-xl font-bold text-foreground">Seguimiento único de cada caso</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lifecycle.map(([number, title, description]) => (
            <li key={number} className="rounded-xl border border-border p-4">
              <p className="text-xs font-black tracking-widest text-primary">{number}</p>
              <h3 className="mt-2 font-bold text-foreground">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="guardrails-heading" className="rounded-2xl border border-border p-5">
        <h2 id="guardrails-heading" className="font-bold text-foreground">Controles de calidad y seguridad</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          <li>Acceso administrativo restringido en el servidor al rol admin.</li>
          <li>Historial de cambios y responsables para que el seguimiento no se pierda.</li>
          <li>GPT propone resúmenes y posibles causas; el equipo valida las conclusiones.</li>
          <li>Las correcciones pasan por pruebas y Vercel Preview antes de producción.</li>
          <li>Los reportes deben minimizar datos personales y nunca exponer secretos o credenciales.</li>
        </ul>
      </section>
    </main>
  );
}
