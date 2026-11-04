"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BadgeCheck,
  Building2,
  Camera,
  ChevronDown,
  Crown,
  Menu,
  MessageCircle,
  Moon,
  Radio,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Sun,
  TrendingUp,
  Users,
  Wallet,
  X,
  Play,
} from "lucide-react";

const PRIMARY_LINKS = [
  { label: "Inicio", href: "/", icon: Store, description: "Tu portal Credi" },
  { label: "Muro", href: "/social", icon: Users, description: "Comunidad y publicaciones" },
  { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, description: "Productos y tiendas" },
  { label: "Servicios", href: "/services", icon: BadgeCheck, description: "Servicios del ecosistema" },
  { label: "Free", href: "/free", icon: Sparkles, description: "Explora Credi gratis" },
  { label: "LIVE", href: "/live", icon: Radio, description: "Comercio en vivo" },
] as const;

const SOLUTION_GROUPS = [
  {
    title: "Comunidad",
    description: "Conecta y comparte",
    items: [
      { label: "Muro social", href: "/social", icon: Users },
      { label: "Historias", href: "/historias", icon: Camera },
      { label: "Vídeos", href: "/videos", icon: Play },
      { label: "Credi Chat", href: "/chat", icon: MessageCircle },
      { label: "Credi LIVE", href: "/live", icon: Radio },
    ],
  },
  {
    title: "Comercio",
    description: "Descubre y vende",
    items: [
      { label: "Marketplace", href: "/marketplace", icon: ShoppingBag },
      { label: "B2B", href: "/b2b", icon: Building2 },
      { label: "Publicar", href: "/publish", icon: Sparkles },
      { label: "Servicios", href: "/services", icon: Store },
      { label: "Afiliados", href: "/affiliate", icon: TrendingUp },
      { label: "Proveedores verificados", href: "/proveedores-verificados", icon: BadgeCheck },
      { label: "Catálogo en vídeo", href: "/catalogo-video", icon: Play },
    ],
  },
  {
    title: "Tu negocio",
    description: "Administra y crece",
    items: [
      { label: "Centro B2B", href: "/dashboard/b2b", icon: Building2 },
      { label: "Marketing", href: "/marketing", icon: TrendingUp },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Inventario", href: "/inventario", icon: Store },
      { label: "Pagos y cobros", href: "/pagos", icon: Wallet },
      { label: "Wallet", href: "/wallet", icon: Wallet },
      { label: "Credi Intelligence", href: "/intelligence", icon: Sparkles },
      { label: "Seguridad", href: "/security", icon: ShieldCheck },
    ],
  },
] as const;

function isPathActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lightMode, setLightMode] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    setLightMode(document.documentElement.classList.contains("credi-light-mode"));
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const closeMenus = () => setMobileOpen(false);
  const toggleTheme = () => {
    const next = !lightMode;
    document.documentElement.classList.toggle("credi-light-mode", next);
    setLightMode(next);
  };

  return (
    <nav aria-label="Barra superior" className="credi-topbar relative flex items-center gap-3">
      <Link
        href="/"
        onClick={closeMenus}
        className="group flex shrink-0 items-center gap-2.5 xl:hidden"
        aria-label="Credi Marketplace — Inicio"
      >
        <span className="relative grid size-10 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-white/20">
          <Image src="/logo.png" alt="" fill sizes="40px" priority className="object-contain p-1" />
        </span>
        <span className="hidden flex-col leading-none sm:flex">
          <span className="text-lg font-black tracking-tight text-white">Credi</span>
          <span className="mt-1 text-[9px] font-bold tracking-wide text-cyan-100">Compra · Vende · Conecta</span>
        </span>
      </Link>

      <form action="/search" method="get" role="search" className="credi-topbar-search flex flex-1 items-center gap-3 px-4">
        <Search className="size-5 shrink-0 text-cyan-100" aria-hidden="true" />
        <input
          type="search"
          name="q"
          aria-label="Buscar en Credi"
          placeholder="Buscar en Credi Chat, productos y servicios…"
          autoComplete="off"
          className="h-full min-h-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm text-white outline-none"
        />
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Link href="/analytics" className="credi-topbar-action hidden sm:inline-flex" aria-label="Abrir Analytics" title="Analytics">
          <BarChart3 className="size-5 text-cyan-200" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className="credi-topbar-action"
          aria-label={lightMode ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
          aria-pressed={lightMode}
          title={lightMode ? "Tema claro activo" : "Tema oscuro activo"}
        >
          {lightMode ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
        </button>
        <Link href="/chat" className="credi-topbar-action hidden sm:inline-flex" aria-label="Abrir Credi Chat" title="Credi Chat">
          <MessageCircle className="size-5" aria-hidden="true" />
        </Link>
        <Link href="/security" className="credi-topbar-action hidden md:inline-flex" aria-label="Abrir Seguridad y configuración" title="Seguridad">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </Link>
        <Link href="/pricing" className="credi-premium-link hidden sm:inline-flex">
          <Crown className="size-5 text-yellow-300" aria-hidden="true" />
          Premium
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
          aria-controls="credi-mobile-menu"
          className="credi-topbar-action xl:hidden"
        >
          {mobileOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>

      {mobileOpen && (
        <div id="credi-mobile-menu" className="absolute left-0 right-0 top-full z-[100] max-h-[calc(100dvh-64px)] overflow-y-auto border-t border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl xl:hidden sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[var(--foreground)]">¿Qué quieres hacer hoy?</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Todo Credi, organizado para ti.</p>
            </div>
            <Link href="/pricing" onClick={closeMenus} className="credi-premium-link">
              <Crown className="size-4 text-yellow-300" aria-hidden="true" /> Premium
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PRIMARY_LINKS.map((item) => {
              const Icon = item.icon;
              const active = isPathActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenus}
                  aria-current={active ? "page" : undefined}
                  className={"flex min-h-[88px] flex-col justify-between rounded-2xl border p-3 transition focus-visible:outline-2 focus-visible:outline-[var(--primary)] " + (active ? "border-violet-400 bg-violet-500/15 text-[var(--foreground)]" : "border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)]")}
                >
                  <Icon className="size-5 text-cyan-300" aria-hidden="true" />
                  <span className="text-sm font-black">{item.label}</span>
                  <span className="text-[11px] leading-4 text-[var(--muted)]">{item.description}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-5 space-y-2">
            {SOLUTION_GROUPS.map((group) => (
              <details key={group.title} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)]">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] [&::-webkit-details-marker]:hidden">
                  <span>{group.title}<span className="ml-2 text-xs font-normal text-[var(--muted)]">{group.description}</span></span>
                  <ChevronDown className="size-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="grid grid-cols-1 gap-1 px-2 pb-2 sm:grid-cols-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isPathActive(pathname, item.href);
                    return (
                      <Link key={item.href + item.label} href={item.href} onClick={closeMenus} aria-current={active ? "page" : undefined} className={"flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition focus-visible:outline-2 focus-visible:outline-[var(--primary)] " + (active ? "bg-violet-500/15 font-bold text-[var(--foreground)]" : "text-[var(--foreground)] hover:bg-[var(--surface)]")}>
                        <Icon className="size-4 text-cyan-300" aria-hidden="true" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href="/security" onClick={closeMenus} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm font-bold text-[var(--foreground)]">
              <ShieldCheck className="size-4" /> Seguridad
            </Link>
            <Link href="/chat" onClick={closeMenus} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm font-bold text-[var(--foreground)]">
              <MessageCircle className="size-4" /> Credi Chat
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
