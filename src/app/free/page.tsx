import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle, ShoppingBag, Sparkles, Store, Users } from "lucide-react";
import { getProducts } from "@/lib/database/queries";

export const metadata: Metadata = {
  title: "Credi Free | Credi Marketplace",
  description: "El espacio gratuito de Credi para descubrir, publicar, conversar y participar en la comunidad.",
};

export const revalidate = 60;

export default async function FreePage() {
  let productCount = 0;
  try { productCount = (await getProducts(12)).length; } catch { productCount = 0; }

  const cards = [
    { title: "Muro", text: "Historias, publicaciones y reels en un feed social conectado al comercio.", href: "/social", icon: Users },
    { title: "Marketplace", text: "Descubre productos, tiendas y oportunidades comerciales.", href: "/marketplace", icon: ShoppingBag },
    { title: "Servicios", text: "Encuentra profesionales y soluciones dentro de Credi.", href: "/services", icon: Store },
    { title: "Chat", text: "Conversa, pregunta, negocia y comparte información comercial.", href: "/chat", icon: MessageCircle },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_.6fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1.5 text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]"><Sparkles className="size-4" /> Credi Free</span>
              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">Un solo lugar para descubrir, conectar y participar.</h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)] sm:text-lg">Free no es un segundo portal ni un plan comercial: es la experiencia de entrada al mismo ecosistema Credi. Desde aquí puedes ir al Muro, Marketplace, Servicios y Chat sin cambiar de identidad ni de navegación.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/social" className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white shadow-lg">Entrar al Muro <ArrowRight className="size-4" /></Link>
                <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-5 py-3 text-sm font-black">Explorar Marketplace <ArrowRight className="size-4" /></Link>
              </div>
            </div>
            <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface-secondary)] p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[.15em] text-[var(--muted)]">Ecosistema</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[var(--surface)] p-4"><p className="text-2xl font-black">{productCount}</p><p className="mt-1 text-xs font-bold text-[var(--muted)]">productos visibles</p></div>
                <div className="rounded-2xl bg-[var(--surface)] p-4"><p className="text-2xl font-black">1</p><p className="mt-1 text-xs font-bold text-[var(--muted)]">portal</p></div>
              </div>
              <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Los roles internos de administración no se presentan como planes comerciales.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6"><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Tu portal</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">Todo conectado, sin duplicar experiencias</h2></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({title,text,href,icon:Icon}) => <Link key={title} href={href} className="group rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><span className="flex size-11 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><Icon className="size-5" /></span><h3 className="mt-5 text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">Entrar <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span></Link>)}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Link href="/social" className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm"><span className="text-xs font-black uppercase tracking-[.15em] text-[var(--primary)]">Experiencia social</span><h2 className="mt-3 text-2xl font-black">Muro + Historias + Reels</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">Un feed de tres zonas en escritorio, navegación lateral, contenido central y acciones/oportunidades. En móvil se adapta a una navegación compacta.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">Abrir Muro <ArrowRight className="size-4" /></span></Link>
          <Link href="/pricing" className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface-secondary)] p-7 shadow-sm"><span className="text-xs font-black uppercase tracking-[.15em] text-[var(--muted)]">Escala</span><h2 className="mt-3 text-2xl font-black">Capacidades comerciales opcionales</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">Free permanece como puerta de entrada. Los planes comerciales amplían capacidades sin convertir al creador o administrador en un plan.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">Ver planes <ArrowRight className="size-4" /></span></Link>
        </div>

        <div className="mt-8 rounded-[2rem] border border-[var(--border)] bg-neutral-950 p-7 text-white shadow-2xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[.16em] text-cyan-200">Un portal</p><h2 className="mt-2 text-2xl font-black">La navegación es común para toda la plataforma.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-300">No hay un “Credi Free” separado del producto: es el acceso gratuito al mismo Credi Marketplace.</p></div>
            <Link href="/register" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-black hover:bg-brand-500">Crear cuenta <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
