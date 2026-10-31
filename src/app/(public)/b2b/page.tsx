import type { Metadata } from "next";
import Link from "next/link";
import B2BMarketplace from "@/components/marketplace/B2BMarketplace";
import DomainBridge from "@/components/portal/DomainBridge";

export const metadata: Metadata = {
  title: "Mercado B2B y Mayoristas | Credi Marketplace",
  description: "Compra al mayor, descubre proveedores y publica ofertas B2B con imagen y vídeo.",
  keywords: ["B2B", "mercado mayorista", "proveedores", "fabricantes", "importadores", "compras al mayor", "Credi Marketplace"],
  alternates: { canonical: "/b2b" },
  openGraph: { title: "Mercado B2B y Mayoristas | Credi Marketplace", description: "Conecta empresas, proveedores y compradores en Credi Marketplace.", type: "website", siteName: "Credi Marketplace", url: "/b2b" },
  robots: { index: true, follow: true },
};

export default function B2BPage() {
  return <main id="main-content" className="min-h-screen bg-background text-foreground"><section aria-labelledby="b2b-marketplace-title" className="py-6 sm:py-8 lg:py-10"><div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
    <DomainBridge context="b2b" />
    <div className="mb-5 overflow-hidden rounded-3xl border border-cyan-300/10 bg-slate-950/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_24px_70px_rgba(2,8,28,.25)] sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 id="b2b-marketplace-title" className="text-xl font-black text-white sm:text-2xl">Mercado B2B y Mayoristas</h1><p className="mt-1 text-sm text-slate-400">Un flujo empresarial completo: ofertas, abastecimiento, cotizaciones, negociación y pedidos.</p></div><Link href="/b2b/publish" className="rounded-xl bg-amber-300 px-4 py-3 text-center text-xs font-black text-slate-950">Publicar oferta B2B</Link></div><nav aria-label="Herramientas B2B" className="mt-5 flex flex-wrap gap-2"><Link href="/abastecimiento" className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-slate-100">Solicitar abastecimiento</Link><Link href="/compras-mayoristas" className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-slate-100">Compras mayoristas</Link><Link href="/dashboard/b2b" className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-slate-100">Panel B2B</Link><Link href="/dashboard/b2b/orders" className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-slate-100">Pedidos B2B</Link><Link href="/negociaciones" className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-slate-100">Negociaciones</Link><Link href="/chat" className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-slate-100">Credi Chat</Link></nav></div>
    <B2BMarketplace />
  </div></section></main>;
}
