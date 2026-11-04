'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  BarChart3,
  Building2,
  BriefcaseBusiness,
  MessageCircle,
  Radio,
  Share2,
  ShoppingBag,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react'

const portals = [
  { href: '/social', label: 'Comunidad', icon: Users },
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/live', label: 'LIVE', icon: Radio },
  { href: '/affiliate', label: 'Afiliados', icon: Share2 },
  { href: '/b2b', label: 'B2B', icon: Building2 },
  { href: '/wallet', label: 'Wallet', icon: WalletCards },
  { href: '/intelligence', label: 'Intelligence', icon: BarChart3 },
  { href: '/business-os', label: 'Business OS', icon: Activity },
  { href: '/jobs', label: 'Empleo', icon: BriefcaseBusiness },
  { href: '/services', label: 'Servicios', icon: Sparkles },
] as const

export default function CrediServicePortalNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Portales de servicios Credi"
      className="rounded-2xl border border-border bg-card/90 p-3 shadow-sm"
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
        <span className="text-[10px] font-black uppercase tracking-[.2em] text-muted-foreground">
          Portales Credi
        </span>
        <span className="ml-auto hidden text-[10px] font-semibold text-muted-foreground sm:inline">
          Un ecosistema · espacios especializados
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {portals.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active
                  ? 'border-primary/30 bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground'
              }`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
