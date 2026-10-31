"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Building2, ChevronDown, Radio, Send, ShoppingBag, Store, Users, MessageCircle, Sparkles, BadgeCheck, TrendingUp } from "lucide-react";

const primary = [
  { label: "Muro", href: "/social", icon: Users },
  { label: "Marketplace", href: "/marketplace", icon: ShoppingBag },
  { label: "Publicar", href: "/publish", icon: Send, highlight: true },
  { label: "Chat", href: "/chat", icon: MessageCircle },
  { label: "LIVE", href: "/live", icon: Radio },
];

const more = [
  { label: "Inicio", href: "/", icon: Store },
  { label: "Servicios", href: "/services", icon: BadgeCheck },
  { label: "Credi Free", href: "/free", icon: Sparkles },
  { label: "Afiliados", href: "/affiliate", icon: TrendingUp },
  { label: "B2B", href: "/b2b", icon: Building2 },
];

function activePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export default function CrediQuickAccess() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <div className="sticky top-[72px] z-30 border-b border-slate-200 bg-white/95 shadow-[0_4px_18px_rgba(15,23,42,.06)] backdrop-blur-xl xl:hidden">
      <div className="relative mx-auto max-w-[1600px] px-2 sm:px-4">
        <nav aria-label="Accesos rápidos de Credi" className="flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {primary.map(({ label, href, icon: Icon, highlight }) => {
            const active = activePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={"inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:px-4 sm:text-sm " +
                  (highlight
                    ? "bg-gradient-to-r from-cyan-300 to-blue-400 text-slate-950 shadow-sm"
                    : active
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                      : "text-slate-700 hover:bg-slate-100")}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((value) => !value)}
            aria-expanded={moreOpen}
            aria-controls="credi-quick-access-more"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:px-4 sm:text-sm"
          >
            Más <ChevronDown className={"size-4 transition-transform " + (moreOpen ? "rotate-180" : "")} aria-hidden="true" />
          </button>
        </nav>
        {moreOpen && (
          <div id="credi-quick-access-more" className="absolute left-2 right-2 top-full z-[110] grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_55px_rgba(15,23,42,.2)] sm:grid-cols-5">
            {more.map(({ label, href, icon: Icon }) => {
              const active = activePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={"inline-flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-blue-600 " + (active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50")}
                >
                  <span className="inline-flex items-center gap-2"><Icon className="size-4 text-blue-600" aria-hidden="true" />{label}</span>
                  <ArrowUpRight className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
