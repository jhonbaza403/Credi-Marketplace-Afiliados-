import type { Metadata } from "next"
import Link from "next/link"
import AffiliateApplicationForm from "@/components/affiliate/AffiliateApplicationForm"

export const metadata: Metadata = {
  title: "Programa de afiliados | Credi Marketplace",
  description: "Solicita acceso al programa de afiliados de Credi Marketplace.",
}

export default function AffiliatePage() {
  return <main className="min-h-screen bg-[#050816] text-white"><div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
    <header className="mb-6 overflow-hidden rounded-[2rem] border border-cyan-300/10 bg-[radial-gradient(circle_at_12%_10%,rgba(34,211,238,.15),transparent_32%),radial-gradient(circle_at_90%_0%,rgba(168,85,247,.16),transparent_34%),linear-gradient(135deg,#0b1024,#060914)] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_30px_100px_rgba(0,0,0,.3)] sm:p-10"><span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Credi Affiliate</span><h1 className="mt-4 text-3xl font-black sm:text-5xl">Convierte recomendaciones en comercio.</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">Completa tu perfil, selecciona cómo promocionarás productos y espera la revisión del programa. Después tendrás un centro para crear enlaces por producto y gestionar tus comisiones.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/dashboard/affiliate" className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-sm font-black text-white">Mi panel</Link><Link href="/dashboard/affiliate/links" className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-black text-cyan-100">Enlaces por producto</Link></div></header>
    <AffiliateApplicationForm />
  </div></main>
}
