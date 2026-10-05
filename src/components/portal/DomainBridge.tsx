"use client"

import Link from "next/link"
import { Building2, MessageCircle, PackagePlus, Radio, Share2, ShoppingBag, Wrench } from "lucide-react"

type DomainBridgeProps = {
  context?: "marketplace" | "services" | "chat" | "publish" | "affiliate" | "wallet" | "marketing"
}

const actions = {
  marketplace: [
    { href: "/publish", label: "Publicar", icon: PackagePlus },
    { href: "/services", label: "Servicios", icon: Wrench },
    { href: "/chat", label: "Contactar", icon: MessageCircle },
    { href: "/affiliate", label: "Afiliados", icon: Share2 },
  ],
  services: [
    { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
    { href: "/chat", label: "Contactar", icon: MessageCircle },
    { href: "/publish", label: "Publicar", icon: PackagePlus },
    { href: "/affiliate", label: "Afiliados", icon: Share2 },
  ],
  chat: [
    { href: "/marketplace", label: "Explorar productos", icon: ShoppingBag },
    { href: "/services", label: "Explorar servicios", icon: Wrench },
    { href: "/publish", label: "Publicar", icon: PackagePlus },
  ],
  publish: [
    { href: "/marketplace", label: "Añadir destino comercial", icon: ShoppingBag },
    { href: "/services", label: "Ver servicios", icon: Wrench },
    { href: "/chat", label: "Abrir Chat", icon: MessageCircle },
  ],
  affiliate: [
    { href: "/marketplace", label: "Explorar productos", icon: ShoppingBag },
    { href: "/publish", label: "Publicar", icon: PackagePlus },
    { href: "/chat", label: "Contactar", icon: MessageCircle },
  ],
  wallet: [
    { href: "/orders", label: "Mis pedidos", icon: ShoppingBag },
    { href: "/chat", label: "Soporte / Chat", icon: MessageCircle },
  ],
  b2b: [
    { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
    { href: "/chat", label: "Negociar por Chat", icon: MessageCircle },
    { href: "/affiliate", label: "Afiliados", icon: Share2 },
    { href: "/live", label: "LIVE Commerce", icon: Radio },
  ],
  marketing: [
    { href: "/publish", label: "Crear contenido", icon: PackagePlus },
    { href: "/live", label: "Crear LIVE", icon: MessageCircle },
    { href: "/analytics", label: "Ver Analytics", icon: Share2 },
  ],
} as const

export default function DomainBridge({ context = "marketplace" }: DomainBridgeProps) {
  return (
    <nav aria-label="Continuar en Credi" className="mt-6 flex flex-wrap gap-2">
      {actions[context].map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-xs font-black text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
