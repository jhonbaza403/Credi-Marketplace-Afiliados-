import Link from "next/link";
import DomainBridge from "@/components/portal/DomainBridge";
import type { Metadata } from "next";
import { ArrowRight, Building2, CreditCard, Headphones, MessageCircle, Radio, Share2, ShieldCheck, ShoppingBag, Sparkles, Store, Users, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "Servicios | Credi Marketplace",
  description: "Centro de servicios de Credi: comercio, mensajería, LIVE, afiliados, B2B, pagos y herramientas para vendedores.",
  alternates: { canonical: "/services" },
};

const services = [
  { title: "Marketplace", description: "Explora productos, compara ofertas, consulta disponibilidad y compra dentro de Credi.", href: "/marketplace", icon: ShoppingBag, group: "Comercio" },
  { title: "Publicar productos y servicios", description: "Crea ofertas con imágenes, vídeos, inventario y distribución a los canales comerciales habilitados.", href: "/products/create", icon: Store, group: "Comercio" },
  { title: "Carrito y pedidos", description: "Continúa al checkout, consulta tus compras y revisa el estado de tus pedidos.", href: "/orders", icon: CreditCard, group: "Comercio" },
  { title: "Credi Chat", description: "Comunícate con compradores, vendedores y equipos mediante conversaciones vinculadas a operaciones.", href: "/chat", icon: MessageCircle, group: "Comunidad" },
  { title: "Muro, historias y reels", description: "Descubre contenido de la comunidad, comparte publicaciones y participa en conversaciones.", href: "/social", icon: Users, group: "Comunidad" },
  { title: "Credi LIVE", description: "Explora transmisiones, sesiones comerciales, productos destacados y contenido en directo.", href: "/live", icon: Radio, group: "Comunidad" },
  { title: "Credi Free", description: "Accede a la experiencia gratuita conectada con el mismo ecosistema y cuenta Credi.", href: "/free", icon: Sparkles, group: "Comunidad" },
  { title: "CREDI-AFFILIATE-AI", description: "Solicita afiliación, gestiona enlaces por producto y consulta resultados y comisiones.", href: "/affiliate", icon: Share2, group: "Crecimiento" },
  { title: "Mercado B2B y mayoristas", description: "Busca proveedores, publica lotes, solicita cotizaciones y negocia compras empresariales.", href: "/b2b", icon: Building2, group: "Empresas" },
  { title: "Abastecimiento", description: "Publica solicitudes de compra y recibe cotizaciones de proveedores de la red.", href: "/abastecimiento", icon: Store, group: "Empresas" },
  { title: "Centro de vendedores", description: "Administra catálogo, inventario, perfil comercial y operaciones de tu tienda.", href: "/dashboard/seller", icon: Wallet, group: "Empresas" },
  { title: "Billetera Credi", description: "Consulta los movimientos y herramientas financieras disponibles en tu cuenta.", href: "/wallet", icon: Wallet, group: "Cuenta y soporte" },
  { title: "Verificación y seguridad", description: "Gestiona la verificación de identidad, empresa y controles de seguridad de la cuenta.", href: "/account/verificacion", icon: ShieldCheck, group: "Cuenta y soporte" },
  { title: "Centro de soporte", description: "Encuentra orientación y canales de atención para resolver incidencias de Credi.", href: "/soporte", icon: Headphones, group: "Cuenta y soporte" },
] as const;

const groups = ["Comercio", "Comunidad", "Crecimiento", "Empresas", "Cuenta y soporte"] as const;

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <DomainBridge context="services" />
        <header className="relative isolate mb-9 overflow-hidden rounded-[2rem] border border-violet-300/20 bg-[linear-gradient(115deg,#080d3b_0%,#241078_52%,#075a91_100%)] p-7 text-white shadow-[0_24px_70px_rgba(30,20,120,.18)] sm:p-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-cyan-300/20 blur-3xl"/>
          <div className="relative max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-cyan-100"><Sparkles size={13}/> Ecosistema Credi</span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Todos los servicios. Una sola plataforma.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-blue-100/80 sm:text-base">Accede a las herramientas de comercio, comunidad, comunicación, afiliación y operaciones empresariales de Credi desde una cuenta y una experiencia conectada.</p>
            <div className="mt-6 flex flex-wrap gap-3"><Link href="/marketplace" className="rounded-full bg-yellow-300 px-5 py-3 text-sm font-black text-slate-950">Explorar Marketplace</Link><Link href="/chat" className="rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white">Abrir Credi Chat</Link></div>
          </div>
        </header>

        <div className="space-y-10">
          {groups.map((group) => {
            const items = services.filter((service) => service.group === group);
            return <section key={group} aria-labelledby={`services-${group.replaceAll(" ", "-")}`}>
              <div className="mb-4"><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Servicios Credi</p><h2 id={`services-${group.replaceAll(" ", "-")}`} className="mt-1 text-2xl font-black">{group}</h2></div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map(({title,description,href,icon:Icon})=><Link key={title} href={href} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-1 hover:border-[var(--primary)]/40 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
                  <div className="flex items-start justify-between gap-4"><span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><Icon size={22}/></span><ArrowRight size={18} className="text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--primary)]"/></div>
                  <h3 className="mt-5 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p><span className="mt-5 inline-flex text-xs font-black text-[var(--primary)]">Abrir servicio</span>
                </Link>)}
              </div>
            </section>;
          })}
        </div>
      </div>
    </main>
  );
}
