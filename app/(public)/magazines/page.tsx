import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Publicaciones", description: "Publicaciones y recursos del ecosistema Credi Marketplace." };

export default function MagazinesPage() {
  return <main className="min-h-screen bg-marketplace-background"><section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8"><p className="text-sm font-bold uppercase tracking-widest text-brand-600">Biblioteca Credi</p><h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Publicaciones y recursos especializados</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600">Un espacio preparado para publicaciones, investigaciones y recursos profesionales.</p><Link href="/marketplace" className="mt-8 inline-flex rounded-xl bg-brand-600 px-5 py-3 font-bold text-white">Explorar Marketplace</Link></section></main>;
}
