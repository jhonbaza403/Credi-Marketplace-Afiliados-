'use client'

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, MessageCircle, MoreHorizontal, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CAPABILITY_DOMAINS, PRIMARY_DOMAINS } from "@/config/portal";


export default function Navbar() {
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const active = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const close = () => { setMobile(false); setMoreOpen(false); };

  return (
    <nav className="mx-auto flex min-h-16 max-w-[1500px] items-center gap-3 px-3 sm:px-6 lg:px-8" aria-label="Navegación principal">
      <Link href="/" onClick={close} className="flex shrink-0 items-center gap-2.5" aria-label="Credi Marketplace — Inicio">
        <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white shadow-lg">
          <Image src="/logo.png" alt="Credi" fill sizes="40px" priority className="object-contain p-1" />
        </span>
        <span className="hidden text-base font-black tracking-tight text-white sm:block">Credi</span>
      </Link>

      <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
        {PRIMARY_DOMAINS.map(({label, href}) => (
          <Link key={href} href={href} className={`rounded-xl px-3.5 py-2.5 text-sm font-black transition ${active(href) ? "bg-white/14 text-white shadow-sm" : "text-white/75 hover:bg-white/8 hover:text-white"}`}>
            {label}
          </Link>
        ))}
        <div className="relative">
          <button type="button" onClick={() => setMoreOpen(v => !v)} aria-expanded={moreOpen} className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-black text-white/75 hover:bg-white/8 hover:text-white">
            <MoreHorizontal className="size-4" /> Más <ChevronDown className={`size-3.5 transition ${moreOpen ? "rotate-180" : ""}`} />
          </button>
          {moreOpen && (
            <div className="absolute left-0 top-full z-[100] mt-2 grid w-[320px] grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-[#07101f]/98 p-2 shadow-2xl backdrop-blur-xl">
              {CAPABILITY_DOMAINS.map(({label, href}) => <Link key={href} href={href} onClick={close} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">{label}</Link>)}
            </div>
          )}
        </div>
      </div>

      <div className="ml-auto hidden items-center gap-2 lg:flex">
        <Link href="/publish" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-sm font-black text-white hover:bg-white/15">
          <Sparkles className="size-4" /> Publicar
        </Link>
        <Link href="/chat" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2.5 text-sm font-black text-white shadow-lg hover:bg-brand-500">
          <MessageCircle className="size-4" /> Chat
        </Link>
      </div>

      <button type="button" onClick={() => setMobile(v => !v)} className="ml-auto rounded-xl border border-white/10 bg-white/10 p-2.5 text-white lg:hidden" aria-label={mobile ? "Cerrar menú" : "Abrir menú"} aria-expanded={mobile}>
        {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {mobile && (
        <div className="absolute left-0 top-16 z-[100] w-full border-b border-white/10 bg-[#07101f]/98 p-4 shadow-2xl backdrop-blur-xl lg:hidden">
          <div className="grid grid-cols-2 gap-2">
            {primary.map(([label, href]) => <Link key={href} href={href} onClick={close} className={`rounded-xl px-3 py-3 text-sm font-black ${active(href) ? "bg-white/15 text-white" : "bg-white/5 text-white/80"}`}>{label}</Link>)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {more.map(([label, href]) => <Link key={href} href={href} onClick={close} className="rounded-xl bg-white/5 px-3 py-3 text-sm font-semibold text-white/80 hover:bg-white/10">{label}</Link>)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/publish" onClick={close} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-3 text-sm font-black text-white"><Sparkles className="size-4" /> Publicar</Link>
            <Link href="/chat" onClick={close} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-3 text-sm font-black text-white"><MessageCircle className="size-4" /> Chat</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
