import type { Metadata } from "next"
import DomainBridge from "@/components/portal/DomainBridge"
import Link from "next/link"
import AffiliateApplicationForm from "@/components/affiliate/AffiliateApplicationForm"
import AIAssistant from "@/components/ai/AIAssistant"

export const metadata: Metadata = {
  title: "CREDI-AFFILIATE-AI | Credi Marketplace",
  description: "Programa inteligente de afiliación de Credi Marketplace para crear enlaces, promover productos y gestionar comisiones.",
}

export default function AffiliatePage() {
  return <main className="affiliate-page min-h-screen bg-[var(--background)] text-[var(--foreground)]"><div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
    <header className="affiliate-hero mb-6 overflow-hidden rounded-[2rem] border border-cyan-300/10 bg-[radial-gradient(circle_at_12%_10%,rgba(34,211,238,.15),transparent_32%),radial-gradient(circle_at_90%_0%,rgba(168,85,247,.16),transparent_34%),linear-gradient(135deg,#0b1024,#060914)] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_30px_100px_rgba(0,0,0,.3)] sm:p-10"><span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">CREDI-AFFILIATE-AI</span><h1 className="mt-4 text-3xl font-black text-white sm:text-5xl">Convierte recomendaciones en comercio inteligente.</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">Solicita acceso al programa, completa tu perfil y, tras la revisión, utiliza el centro de afiliados para crear enlaces por producto y gestionar tu actividad y comisiones.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/dashboard/affiliate" className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-sm font-black text-white">Mi panel</Link><Link href="/dashboard/affiliate/links" className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-black text-cyan-100">Enlaces por producto</Link></div></header>
    <DomainBridge context="affiliate" />
    <section className="mb-8 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><p className="text-sm font-black">Atribución por producto</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Enlaces rastreables para identificar referencias y conversiones.</p></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><p className="text-sm font-black">Rendimiento y comisiones</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Panel de referidos, ventas y comisiones estimadas.</p></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><p className="text-sm font-black">Cumplimiento</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Divulgación de afiliados y datos fiscales según la revisión del programa.</p></div></section>
    <AffiliateApplicationForm />
    <section className="mt-10"><div className="mb-4"><p className="text-xs font-black uppercase tracking-[.18em] text-[var(--primary)]">Credi AI · Marketing</p><h2 className="mt-1 text-2xl font-black">Copiloto para tu crecimiento como afiliado</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Prepara ideas de campañas, mensajes y estrategias de promoción. La IA ayuda a planificar; la creación de enlaces, atribución y comisiones siguen dependiendo de los servicios reales del programa.</p></div><AIAssistant /></section>
  </div></main>
}
