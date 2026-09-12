'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown, LayoutDashboard, Menu, MessageCircle, PackageSearch, Store, Users, WalletCards, X } from 'lucide-react'
import { useState } from 'react'

const groups = [
  { label: 'Comercio', icon: Store, items: [['Marketplace','/marketplace'],['Compras mayoristas','/compras-mayoristas'],['Abastecimiento B2B','/abastecimiento'],['Proveedores verificados','/proveedores-verificados'],['Servicios','/services'],['Pedidos','/orders']] },
  { label: 'Empresa', icon: LayoutDashboard, items: [['Business OS','/business-os'],['Commerce Studio','/commerce-studio'],['Gestión empresarial','/gestion-empresarial'],['Inventario','/inventario'],['Negociaciones','/negociaciones'],['Analytics','/analytics']] },
  { label: 'Red', icon: Users, items: [['CREDI-AFFILIATE-AI','/affiliate'],['Panel de afiliados','/dashboard/affiliate'],['Enlaces por producto','/dashboard/affiliate/links'],['Red Comercial','/red-comercial'],['Social','/social'],['Credi Chat','/chat'],['Reputación','/dashboard/reputation']] },
  { label: 'Finanzas', icon: WalletCards, items: [['Pagos','/pagos'],['Stripe Checkout','/pagos#stripe-checkout'],['Wallet','/wallet'],['Disputas','/disputas']] },
  { label: 'Plataforma', icon: PackageSearch, items: [['Comercio avanzado','/ecosistema-avanzado'],['Intelligence','/intelligence'],['Product Graph','/product-graph'],['Developer','/developer'],['Apps','/apps'],['Seguridad','/security']] },
] as const

const quick = [['Explorar','/explorar'],['Publicar producto','/products/create'],['Mi cuenta','/account']] as const

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const close = () => { setOpen(false); setActiveGroup(null) }
  return (
    <nav className="relative z-50 mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
      <Link href="/" onClick={close} className="flex min-w-0 shrink-0 items-center gap-3" aria-label="Credi Marketplace - Inicio">
        <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white shadow-[0_8px_30px_rgba(0,0,0,.18)]"><Image src="/logo.png" alt="Credi Marketplace" fill sizes="44px" priority className="object-contain p-1" /></span>
        <span className="hidden truncate text-base font-black tracking-tight text-white sm:block sm:text-lg">Credi Marketplace</span>
      </Link>
      <div className="hidden items-center gap-1 lg:flex">
        <Link href="/" className="rounded-lg px-3 py-2 text-sm font-bold text-white/90 hover:bg-white/10">Inicio</Link>
        {groups.map((group) => { const Icon = group.icon; const isOpen = activeGroup === group.label; return <div key={group.label} className="relative"><button type="button" onClick={() => setActiveGroup(isOpen ? null : group.label)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-white/90 hover:bg-white/10" aria-expanded={isOpen}><Icon className="size-4" />{group.label}<ChevronDown className={`size-3.5 ${isOpen ? 'rotate-180' : ''}`} /></button>{isOpen && <div className="absolute left-0 top-full mt-2 w-64 rounded-2xl border border-white/10 bg-[#0a1020]/98 p-2 shadow-2xl">{group.items.map(([name, href]) => <Link key={href} href={href} onClick={close} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">{name}</Link>)}</div>}</div> })}
        <Link href="/chat" className="ml-2 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-black text-white"><MessageCircle className="size-4" />Chat</Link>
      </div>
      <div className="hidden items-center gap-1 xl:flex">{quick.map(([name, href]) => <Link key={href} href={href} className="rounded-lg px-2.5 py-2 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white">{name}</Link>)}</div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white lg:hidden" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
      {open && <div className="absolute left-0 top-full z-[100] w-full border-b border-white/10 bg-[#07101f]/98 p-4 text-white shadow-2xl lg:hidden"><div className="max-h-[78vh] space-y-2 overflow-y-auto"><Link href="/" onClick={close} className="block rounded-xl px-3 py-3 text-sm font-black hover:bg-white/10">Inicio</Link>{groups.map((group) => { const Icon = group.icon; const isOpen = activeGroup === group.label; return <div key={group.label} className="rounded-xl border border-white/5 bg-white/[0.03]"><button type="button" onClick={() => setActiveGroup(isOpen ? null : group.label)} className="flex w-full items-center justify-between px-3 py-3 text-sm font-black"><span className="inline-flex items-center gap-2"><Icon className="size-4" />{group.label}</span><ChevronDown className={`size-4 ${isOpen ? 'rotate-180' : ''}`} /></button>{isOpen && <div className="grid gap-1 border-t border-white/5 p-2 sm:grid-cols-2">{group.items.map(([name, href]) => <Link key={href} href={href} onClick={close} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white">{name}</Link>)}</div>}</div> })}<div className="grid gap-2 pt-2 sm:grid-cols-3">{quick.map(([name, href]) => <Link key={href} href={href} onClick={close} className="rounded-xl bg-white/10 px-3 py-3 text-center text-sm font-black">{name}</Link>)}</div></div></div>}
    </nav>
  )
}
