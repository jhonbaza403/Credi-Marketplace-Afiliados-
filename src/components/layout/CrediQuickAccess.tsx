"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  BadgeCheck,
  Building2,
  Camera,
  ChevronDown,
  CirclePlay,
  Compass,
  HeartHandshake,
  Home,
  MessageCircle,
  Radio,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  live?: boolean;
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

const sections: NavigationSection[] = [
  {
    title: "Tu comunidad",
    items: [
      { label: "Inicio", href: "/", icon: Home },
      { label: "Muro", href: "/social", icon: Users },
      { label: "Historias", href: "/historias", icon: Camera },
      { label: "Reels y vídeos", href: "/videos", icon: CirclePlay },
      { label: "Credi Chat", href: "/chat", icon: MessageCircle },
      { label: "LIVE", href: "/live", icon: Radio, live: true },
    ],
  },
  {
    title: "Comercio",
    items: [
      { label: "Marketplace", href: "/marketplace", icon: ShoppingBag },
      { label: "Servicios", href: "/services", icon: BadgeCheck },
      { label: "Publicar contenido", href: "/publish", icon: Send },
      { label: "Afiliados", href: "/affiliate", icon: TrendingUp },
      { label: "B2B empresarial", href: "/b2b", icon: Building2 },
      { label: "Free", href: "/free", icon: Sparkles },
    ],
  },
  {
    title: "Gestiona y crece",
    items: [
      { label: "Mi billetera", href: "/wallet", icon: Wallet },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Seguridad", href: "/security", icon: ShieldCheck },
      { label: "Proveedores", href: "/proveedores-verificados", icon: HeartHandshake },
    ],
  },
];

const mobilePrimary: NavigationItem[] = sections
  .flatMap((section) => section.items)
  .filter((item) => ["/", "/social", "/marketplace", "/publish", "/chat", "/live"].includes(item.href));

function activePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export default function CrediQuickAccess() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);

  useEffect(() => { setMoreOpen(false); setSolutionsOpen(false); }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen]);

  return (
    <>
      <aside className="credi-app-sidebar fixed inset-y-[72px] left-0 z-30 hidden w-[248px] flex-col xl:flex" aria-label="Navegación del ecosistema Credi">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-200/80">Tu espacio</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-black tracking-tight text-white">Credi</span>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-100">Connect</span>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-300/70">Personas, contenido y comercio en un mismo lugar.</p>
        </div>

        <nav className="credi-sidebar-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
          {sections.map((section) => (
            <section key={section.title} aria-label={section.title}>
              <h2 className="mb-2 px-3 text-[9px] font-black uppercase tracking-[.19em] text-slate-400/75">{section.title}</h2>
              <div className="space-y-1">
                {section.items.map((entry) => {
                  const Icon = entry.icon;
                  const active = activePath(pathname, entry.href);
                  return (
                    <Link
                      key={entry.href}
                      href={entry.href}
                      aria-current={active ? "page" : undefined}
                      className="credi-sidebar-link"
                    >
                      <Icon className="size-[17px] shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                      {entry.live && <span className="credi-live-pulse rounded-md bg-rose-500 px-1.5 py-0.5 text-[8px] font-black tracking-wider text-white">LIVE</span>}
                      {active && <span className="size-1.5 rounded-full bg-cyan-200 shadow-[0_0_10px_rgba(103,232,249,.8)]" aria-hidden="true" />}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => setSolutionsOpen((value) => !value)}
              aria-expanded={solutionsOpen}
              aria-controls="credi-solutions-menu"
              className="flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-xs font-bold text-slate-300 transition hover:bg-white/[.07] hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              <span className="inline-flex items-center gap-2"><Compass className="size-4 text-cyan-200" /> Soluciones</span>
              <ChevronDown className={"size-4 transition-transform " + (solutionsOpen ? "rotate-180" : "")} />
            </button>
            {solutionsOpen && (
              <div id="credi-solutions-menu" className="mt-2 grid grid-cols-1 gap-1 rounded-xl border border-white/10 bg-white/[.04] p-2">
                {[
                  { label: "Historias", href: "/historias" },
                  { label: "Vídeos", href: "/videos" },
                  { label: "Credi Chat", href: "/chat" },
                  { label: "Credi LIVE", href: "/live" },
                  { label: "Marketplace", href: "/marketplace" },
                  { label: "B2B", href: "/b2b" },
                  { label: "Publicar", href: "/publish" },
                  { label: "Servicios", href: "/services" },
                  { label: "Afiliados", href: "/affiliate" },
                  { label: "Proveedores verificados", href: "/proveedores-verificados" },
                  { label: "Catálogo en vídeo", href: "/catalogo-video" },
                  { label: "Centro B2B", href: "/dashboard/b2b" },
                  { label: "Marketing", href: "/marketing" },
                  { label: "Analytics", href: "/analytics" },
                  { label: "Inventario", href: "/inventario" },
                  { label: "Pagos y cobros", href: "/pagos" },
                  { label: "Wallet", href: "/wallet" },
                  { label: "Credi Intelligence", href: "/intelligence" },
                  { label: "Seguridad", href: "/security" },
                ].map((item) => (
                  <Link key={item.href + item.label} href={item.href} className="flex min-h-8 items-center rounded-lg px-3 text-[11px] font-semibold text-slate-300 transition hover:bg-white/[.07] hover:text-white">
                    {item.label}<ArrowUpRight className="ml-auto size-3 text-slate-500" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => setMoreOpen((value) => !value)
              aria-expanded={moreOpen}
              aria-controls="credi-sidebar-more"
              className="flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-xs font-bold text-slate-300 transition hover:bg-white/[.07] hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              <span className="inline-flex items-center gap-2"><Compass className="size-4 text-violet-200" /> Más herramientas</span>
              <ChevronDown className={"size-4 transition-transform " + (moreOpen ? "rotate-180" : "")} />
            </button>
            {moreOpen && (
              <div id="credi-sidebar-more" className="mt-1 space-y-1">
                {[
                  { label: "Inventario", href: "/inventario" },
                  { label: "Pagos y cobros", href: "/pagos" },
                  { label: "Marketing", href: "/marketing" },
                  { label: "Credi Intelligence", href: "/intelligence" },
                  { label: "Catálogo en vídeo", href: "/catalogo-video" },
                  { label: "Centro B2B", href: "/dashboard/b2b" },
                  { label: "Pagos y pedidos", href: "/orders" },
                ].map((item) => (
                  <Link key={item.href} href={item.href} className="flex min-h-9 items-center rounded-lg px-3 pl-9 text-[11px] font-semibold text-slate-300 transition hover:bg-white/[.07] hover:text-white">
                    {item.label}<ArrowUpRight className="ml-auto size-3 text-slate-500" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-2xl border border-violet-300/15 bg-gradient-to-br from-violet-500/20 to-cyan-400/10 p-3.5">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-violet-400/20 text-violet-100"><Sparkles className="size-4" /></span>
              <div className="min-w-0">
                <p className="text-xs font-black text-white">Crece con Credi</p>
                <p className="text-[10px] text-slate-300">Activa tu espacio comercial</p>
              </div>
            </div>
            <Link href="/affiliate" className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-400 px-3 text-[11px] font-black text-slate-950 transition hover:brightness-110">
              Conocer afiliados <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <Link href="/register" className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.06] text-xs font-bold text-white transition hover:bg-white/[.11]">
            Crear cuenta Credi
          </Link>
        </div>
      </aside>

      <div className="sticky top-[72px] z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] shadow-[0_8px_22px_rgba(30,25,90,.06)] backdrop-blur-xl xl:hidden">
        <nav aria-label="Navegación principal" className="mx-auto flex max-w-[1600px] items-center gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-4">
          {mobilePrimary.map((item) => {
            const Icon = item.icon;
            const active = activePath(pathname, item.href);
            const label = item.href === "/social" ? "Muro" : item.href === "/publish" ? "Publicar" : item.href === "/chat" ? "Chat" : item.href === "/live" ? "LIVE" : item.label;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={"inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] " + (item.href === "/publish" ? "bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-sm" : active ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "text-[var(--foreground)] hover:bg-[var(--surface-secondary)]")}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />{label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((value) => !value)}
            aria-expanded={moreOpen}
            aria-controls="credi-mobile-more"
            className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-black text-[var(--foreground)]"
          >
            Más <ChevronDown className={"size-4 transition-transform " + (moreOpen ? "rotate-180" : "")} />
          </button>
        </nav>
        {moreOpen && (
          <div id="credi-mobile-more" className="absolute left-2 right-2 top-full z-[110] grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_18px_55px_rgba(15,23,42,.2)] sm:left-4 sm:right-4 sm:grid-cols-4">
            {sections.flatMap((section) => section.items).filter((item) => !mobilePrimary.some((primary) => primary.href === item.href)).map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} aria-current={activePath(pathname, item.href) ? "page" : undefined} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)]">
                  <Icon className="size-4 text-[var(--primary)]" />{item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
