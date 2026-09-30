"use client"

import Link from "next/link"
import { Home, MessageCircle, PlusSquare, Search, ShoppingBag, Sparkles, Users } from "lucide-react"

const items = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/social", label: "Muro", icon: Users },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/pricing", label: "Free", icon: Sparkles },
  { href: "/chat", label: "Chat", icon: MessageCircle },
]

export default function CrediSocialNav({ active }: { active?: "home" | "wall" | "marketplace" | "free" | "chat" }) {
  return (
    <nav aria-label="Navegación principal de Credi" className="sticky top-0 z-40 mb-6 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--surface)_92%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-3 py-2.5 sm:px-4 lg:px-6">
        <Link href="/" aria-label="Credi Inicio" className="mr-1 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-sm">
          <span className="text-sm font-black">C</span>
        </Link>
        <div className="flex min-w-max items-center gap-1">
          {items.map(({ href, label, icon: Icon }) => {
            const key = href === "/" ? "home" : href === "/social" ? "wall" : href === "/marketplace" ? "marketplace" : href === "/pricing" ? "free" : "chat"
            const selected = active === key
            return (
              <Link
                key={href}
                href={href}
                aria-current={selected ? "page" : undefined}
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black transition sm:px-4 sm:text-sm ${selected ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"}`}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <Link href="/search" className="inline-flex size-10 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--muted)] hover:text-[var(--foreground)]" aria-label="Buscar">
            <Search className="size-4" />
          </Link>
          <Link href="/publish" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs font-black text-[var(--foreground)] hover:bg-[var(--surface-secondary)]">
            <PlusSquare className="size-4" /> Publicar
          </Link>
        </div>
      </div>
    </nav>
  )
}
