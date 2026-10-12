'use client';

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  Camera,
  ChevronDown,
  MessageCircle,
  MoreHorizontal,
  Radio,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Wallet,
  X,
  Menu,
  Play,
} from "lucide-react";
import { CAPABILITY_DOMAINS, PORTAL_DOMAINS, PRIMARY_DOMAINS } from "@/config/portal";

const DOMAIN_ICONS = {
  home: Store, wall: Users, marketplace: ShoppingBag, sell: Sparkles, b2b: Building2,
  services: BadgeCheck, free: Sparkles, chat: MessageCircle, live: Radio, marketing: TrendingUp,
  content: Sparkles, analytics: BarChart3, video_catalog: Play, stories: Camera, verified_suppliers: BadgeCheck,
  b2b_ops: Building2, affiliate: TrendingUp, wallet: Wallet, business: Building2,
  intelligence: Sparkles, commerce_studio: Store, inventory: Store, negotiations: Building2,
  payments: Wallet, escrow: ShieldCheck, security: ShieldCheck, videos: Play,
} as const;

const PRIMARY_LINKS = PRIMARY_DOMAINS.map((domain) => ({
  ...domain,
  icon: DOMAIN_ICONS[domain.key as keyof typeof DOMAIN_ICONS] ?? Store,
}));

const COMMUNITY_KEYS = new Set(["chat", "live", "stories", "videos"]);
const COMMERCE_KEYS = new Set(["marketplace", "b2b", "content", "affiliate", "video_catalog", "verified_suppliers"]);
const SECTION_DETAILS = {
  community: { title: "Comunidad", description: "Conecta y comparte" },
  commerce: { title: "Comercio", description: "Descubre y vende" },
  business: { title: "Tu negocio", description: "Administra y crece" },
} as const;

const SOLUTION_GROUPS = [
  { ...SECTION_DETAILS.community, items: CAPABILITY_DOMAINS.filter((item) => COMMUNITY_KEYS.has(item.key)) },
  { ...SECTION_DETAILS.commerce, items: CAPABILITY_DOMAINS.filter((item) => COMMERCE_KEYS.has(item.key)) },
  { ...SECTION_DETAILS.business, items: CAPABILITY_DOMAINS.filter((item) => !item.href.startsWith("/dashboard") && !item.roles && !["search", "login", "register", "orders", "admin", "admin_compliance", "create_product", "publish_b2b"].includes(item.key) && !COMMUNITY_KEYS.has(item.key) && !COMMERCE_KEYS.has(item.key)) },
].map((group) => ({
  ...group,
  items: group.items.map((item) => ({ ...item, icon: DOMAIN_ICONS[item.key as keyof typeof DOMAIN_ICONS] ?? Store })),
}));

function getPortalHref(key: string) {
  return PORTAL_DOMAINS.find((domain) => domain.key === key)?.href ?? "/";
}

function isPathActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setSolutionsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen && !solutionsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setSolutionsOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen, solutionsOpen]);

  const closeMenus = () => {
    setMobileOpen(false);
    setSolutionsOpen(false);
  };

  return (
    <nav
      aria-label="Navegación principal"
      className="relative mx-auto flex min-h-[72px] max-w-[1600px] items-center gap-3 px-3 sm:px-5 lg:px-6"
    >
      <Link
        href={getPortalHref("home")}
        onClick={closeMenus}
        className="group flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        aria-label="Credi Marketplace — Inicio"
      >
        <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-[14px] bg-white shadow-[0_6px_22px_rgba(34,211,238,.2)] ring-1 ring-slate-200 transition group-hover:scale-[1.03]">
          <Image src="/logo.png" alt="" fill sizes="40px" priority className="object-contain p-1" />
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-[17px] font-black tracking-tight text-slate-950">Credi</span>
          <span className="mt-1 text-[9px] font-bold tracking-[.19em] text-blue-700">COMERCIO EN RED</span>
        </span>
      </Link>

      <div className="ml-auto hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
        {PRIMARY_LINKS.map((item) => {
          const Icon = item.icon;
          const active = isPathActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "inline-flex min-h-11 items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 " +
                (active
                  ? "bg-[#e7f3ff] text-[#0866ff] shadow-sm ring-1 ring-[#0866ff]/10"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950")
              }
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}

        <div
          className="relative"
          onBlur={(event) => {
            const next = event.relatedTarget as Node | null;
            if (!next || !event.currentTarget.contains(next)) setSolutionsOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setSolutionsOpen((value) => !value)}
            aria-expanded={solutionsOpen}
            aria-controls="credi-solutions-menu"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
            Soluciones
            <ChevronDown className={"size-3.5 transition-transform " + (solutionsOpen ? "rotate-180" : "")} aria-hidden="true" />
          </button>
          {solutionsOpen && (
            <div
              id="credi-solutions-menu"
              className="absolute right-0 top-full z-[100] mt-3 grid w-[min(850px,calc(100vw-2rem))] grid-cols-1 gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,.45)] backdrop-blur-2xl sm:grid-cols-3 sm:p-5"
            >
              {SOLUTION_GROUPS.map((group) => (
                <section key={group.title} aria-labelledby={"solution-" + group.title.replace(/\s+/g, "-").toLowerCase()}>
                  <h2 id={"solution-" + group.title.replace(/\s+/g, "-").toLowerCase()} className="px-2 text-xs font-black uppercase tracking-[.16em] text-blue-700">
                    {group.title}
                  </h2>
                  <p className="px-2 pb-2 pt-1 text-xs text-slate-500">{group.description}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isPathActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href + item.label}
                          href={item.href}
                          onClick={closeMenus}
                          aria-current={active ? "page" : undefined}
                          className={"flex min-h-10 items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition focus-visible:outline-2 focus-visible:outline-blue-600 " + (active ? "bg-blue-50 font-bold text-blue-700" : "text-slate-700 hover:bg-slate-50 hover:text-slate-950")}
                        >
                          <Icon className="size-4 shrink-0 text-blue-600" aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-2 xl:flex">
        <Link href={getPortalHref("search")} aria-label="Buscar en Credi" title="Buscar" className="inline-flex size-11 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-600">
          <Search className="size-[18px]" aria-hidden="true" />
        </Link>
        <Link href={getPortalHref("sell")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-400 px-4 py-2.5 text-sm font-black text-slate-950 shadow-[0_8px_26px_rgba(34,211,238,.16)] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <Sparkles className="size-4" aria-hidden="true" />
          Publicar
        </Link>
        <Link href={getPortalHref("chat")} aria-label="Abrir Credi Chat" title="Credi Chat" className="inline-flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600">
          <MessageCircle className="size-[18px]" aria-hidden="true" />
        </Link>
        <Link href={getPortalHref("login")} className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-600">
          Entrar
        </Link>
      </div>

      <div className="ml-auto flex items-center gap-1.5 xl:hidden">
        <Link href={getPortalHref("search")} aria-label="Buscar en Credi" title="Buscar" className="inline-flex size-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600">
          <Search className="size-5" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
          aria-expanded={mobileOpen}
          aria-controls="credi-mobile-menu"
          className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {mobileOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>

      {mobileOpen && (
        <div id="credi-mobile-menu" className="absolute left-0 right-0 top-full z-[100] max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-slate-200 bg-white p-4 pb-6 shadow-[0_24px_80px_rgba(0,0,0,.45)] backdrop-blur-2xl xl:hidden sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950">¿Qué quieres hacer hoy?</p>
              <p className="mt-1 text-xs text-slate-500">Todo Credi, organizado para ti.</p>
            </div>
            <Link href={getPortalHref("register")} onClick={closeMenus} className="rounded-xl bg-[#0866ff] px-3.5 py-2.5 text-xs font-black text-white transition hover:bg-[#075ce5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              Crear cuenta
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRIMARY_LINKS.map((item) => {
              const Icon = item.icon;
              const active = isPathActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenus}
                  aria-current={active ? "page" : undefined}
                  className={"flex min-h-[88px] flex-col justify-between rounded-2xl border p-3 transition focus-visible:outline-2 focus-visible:outline-blue-600 " + (active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-800 hover:bg-blue-50")}
                >
                  <Icon className="size-5 text-blue-700" aria-hidden="true" />
                  <span className="text-sm font-black">{item.label}</span>
                  <span className="text-[11px] leading-4 text-slate-500">{item.description}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-5 space-y-2">
            {SOLUTION_GROUPS.map((group) => (
              <details key={group.title} className="group rounded-2xl border border-slate-200 bg-white">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
                  <span>{group.title}<span className="ml-2 text-xs font-normal text-slate-500">{group.description}</span></span>
                  <ChevronDown className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="grid grid-cols-1 gap-1 px-2 pb-2 sm:grid-cols-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isPathActive(pathname, item.href);
                    return (
                      <Link key={item.href + item.label} href={item.href} onClick={closeMenus} aria-current={active ? "page" : undefined} className={"flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition focus-visible:outline-2 focus-visible:outline-blue-600 " + (active ? "bg-white/10 font-bold text-white" : "text-slate-700 hover:bg-slate-50 hover:text-white")}>
                        <Icon className="size-4 text-blue-600" aria-hidden="true" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href={getPortalHref("sell")} onClick={closeMenus} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-400 px-4 py-3 text-sm font-black text-slate-950 focus-visible:outline-2 focus-visible:outline-white">
              <Sparkles className="size-4" aria-hidden="true" /> Publicar
            </Link>
            <Link href={getPortalHref("chat")} onClick={closeMenus} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-600">
              <MessageCircle className="size-4" aria-hidden="true" /> Chat
            </Link>
            <Link href={getPortalHref("login")} onClick={closeMenus} className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600">
              Iniciar sesión
            </Link>
            <Link href={getPortalHref("free")} onClick={closeMenus} className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600">
              Explorar Credi Free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
