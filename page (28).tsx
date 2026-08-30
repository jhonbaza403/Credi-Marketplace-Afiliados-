import Link from "next/link";
export default function SellersPage() {
  return <main className="mx-auto min-h-screen max-w-6xl px-4 py-12"><p className="text-sm font-bold uppercase tracking-widest text-brand-600">Vendedores</p><h1 className="mt-3 text-4xl font-black">Encuentra vendedores</h1><p className="mt-4 max-w-2xl text-neutral-600">El directorio comercial de Credi Marketplace está preparado para crecer con vendedores verificados.</p><Link href="/marketplace" className="mt-7 inline-flex rounded-xl bg-brand-600 px-5 py-3 font-bold text-white">Explorar productos</Link></main>;
}
