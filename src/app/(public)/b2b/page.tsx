import type { Metadata } from "next";
import Link from "next/link";
import B2BMarketplace from "@/components/marketplace/B2BMarketplace";

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
    <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-cyan-300/10 bg-slate-950/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_24px_70px_rgba(2,8,28,.25)] sm:flex-row sm:items-center sm:justify-between"><div><h1 id="b2b-marketplace-title" className="text-xl font-black text-white sm:text-2xl">Mercado B2B y Mayoristas</h1><p className="mt-1 text-sm text-slate-400">Compra, vende y presenta tus lotes con contenido multimedia.</p></div><Link href="/b2b/publish" className="rounded-xl bg-amber-300 px-4 py-2.5 text-center text-xs font-black text-slate-950">Publicar oferta con vídeo</Link></div>
    <B2BMarketplace />
  </div></section></main>;
}
