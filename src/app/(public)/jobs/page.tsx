import Link from "next/link";

const jobs = [
  { id: "marketplace", title: "Oportunidades comerciales", description: "Explora oportunidades profesionales y empresariales dentro del ecosistema Credi Marketplace." }
];

export default function JobsPage() {
  return <main className="mx-auto min-h-screen max-w-6xl px-4 py-12"><h1 className="text-4xl font-black">Oportunidades</h1><p className="mt-3 max-w-2xl text-neutral-600">Espacio preparado para oportunidades profesionales y comerciales.</p><div className="mt-8 grid gap-5 md:grid-cols-2">{jobs.map((job) => <article key={job.id} className="rounded-2xl border border-marketplace-border bg-white p-6 shadow-marketplace"><h2 className="text-xl font-bold">{job.title}</h2><p className="mt-2 text-neutral-600">{job.description}</p><Link href={`/jobs/${encodeURIComponent(job.id)}`} className="mt-5 inline-flex rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white">Ver oportunidad →</Link></article>)}</div></main>;
}
