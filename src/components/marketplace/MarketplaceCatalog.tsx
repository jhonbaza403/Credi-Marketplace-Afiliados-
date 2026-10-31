"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, BriefcaseBusiness, MessageCircle, Plus, Radio, Search, ShoppingBag, SlidersHorizontal, Sparkles, Users } from "lucide-react";
import ProductCard from "@/features/marketplace/components/ProductCard";
import type { Product } from "@/types/product";

type SortMode = "recent" | "price-asc" | "price-desc" | "name";

const shortcuts = [
  { label: "Servicios", href: "/services", icon: BriefcaseBusiness },
  { label: "Credi Chat", href: "/chat", icon: MessageCircle },
  { label: "LIVE", href: "/live", icon: Radio },
  { label: "Afiliados", href: "/affiliate", icon: Users },
  { label: "Mercado B2B", href: "/b2b", icon: ShoppingBag },
  { label: "Credi Free", href: "/free", icon: Sparkles },
] as const;

export default function MarketplaceCatalog({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [stockOnly, setStockOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("recent");

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    const filtered = products.filter((product) => {
      const matchesQuery = !normalized || [product.title, product.description ?? ""].join(" ").toLocaleLowerCase("es").includes(normalized);
      return matchesQuery && (!stockOnly || (product.isActive && product.stock > 0));
    });
    return filtered.sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "name") return a.title.localeCompare(b.title, "es");
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [products, query, stockOnly, sort]);

  return (
    <main className="min-h-screen bg-[var(--background)] px-3 pb-10 text-[var(--foreground)] sm:px-5 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="relative isolate overflow-hidden rounded-[2rem] border border-violet-300/20 bg-[linear-gradient(115deg,#080d3b_0%,#241078_48%,#075a91_100%)] px-5 py-8 text-white shadow-[0_24px_70px_rgba(30,20,120,.22)] sm:px-8 lg:px-10 lg:py-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full bg-cyan-300/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-cyan-100"><Sparkles size={13}/> Credi · Comercio conectado</span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Compra, vende y conecta en un solo lugar.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100/80 sm:text-base">Explora productos publicados por vendedores, consulta disponibilidad, contacta directamente y continúa tu compra dentro de Credi.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/products/create" className="inline-flex items-center gap-2 rounded-full bg-yellow-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg hover:bg-yellow-200"><Plus size={17}/> Publicar producto o servicio</Link>
                <Link href="/b2b" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15">Explorar mayoristas <ArrowDownUp size={16}/></Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:w-64">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><p className="text-2xl font-black">{products.length}</p><p className="mt-1 text-[11px] font-semibold text-blue-100/75">Productos cargados</p></div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><p className="text-2xl font-black">{products.filter((p) => p.isActive && p.stock > 0).length}</p><p className="mt-1 text-[11px] font-semibold text-blue-100/75">Disponibles</p></div>
            </div>
          </div>
        </header>

        <nav aria-label="Accesos rápidos de Credi" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {shortcuts.map(({label,href,icon:Icon}) => <Link key={label} href={href} className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-bold transition hover:border-[var(--primary)]/40 hover:shadow-md"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><Icon size={18}/></span><span>{label}</span></Link>)}
        </nav>

        <section aria-labelledby="catalog-heading" className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[.18em] text-[var(--primary)]">Catálogo Credi</p><h2 id="catalog-heading" className="mt-1 text-2xl font-black sm:text-3xl">Productos destacados</h2><p className="mt-2 text-sm text-[var(--muted)]">Busca, compara disponibilidad y abre una ficha para ver más detalles.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative block sm:min-w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"/><input value={query} onChange={(event)=>setQuery(event.target.value)} type="search" placeholder="Buscar productos…" aria-label="Buscar productos" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"/></label>
              <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-bold"><SlidersHorizontal size={15}/><span>Ordenar</span><select value={sort} onChange={(event)=>setSort(event.target.value as SortMode)} aria-label="Ordenar productos" className="max-w-36 bg-transparent text-sm outline-none"><option value="recent">Más recientes</option><option value="price-asc">Precio: menor</option><option value="price-desc">Precio: mayor</option><option value="name">Nombre A–Z</option></select></label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={stockOnly} onChange={(event)=>setStockOnly(event.target.checked)} className="size-4 accent-[var(--primary)]"/> Mostrar solo disponibles</label>
            <p className="text-xs text-[var(--muted)]" aria-live="polite">{visibleProducts.length} de {products.length} productos</p>
          </div>

          {visibleProducts.length ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleProducts.map((product)=><ProductCard key={product.id} product={product}/>)}</div> : <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center"><ShoppingBag className="mx-auto size-10 text-[var(--muted)]"/><h3 className="mt-4 text-xl font-black">{products.length ? "No encontramos productos con esos filtros" : "El catálogo está preparado para recibir ofertas"}</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{products.length ? "Cambia la búsqueda o desactiva el filtro de disponibilidad para ver más resultados." : "Cuando los vendedores publiquen ofertas activas, aparecerán aquí con sus precios, imágenes y disponibilidad."}</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" onClick={()=>{setQuery("");setStockOnly(false);setSort("recent")}} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold">Limpiar filtros</button><Link href="/products/create" className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-black text-white">Crear una oferta</Link></div></div>}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-violet-300/20 bg-gradient-to-r from-[#090d39] via-[#261078] to-[#071c4c] px-5 py-5 text-white">
          <div><p className="text-sm font-black text-yellow-300">Conecta · Compra · Vende</p><p className="mt-1 text-xs text-blue-100/75">Un comercio conectado con la comunidad Credi.</p></div>
          <div className="flex flex-wrap gap-2"><Link href="/chat" className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold">Hablar con vendedor</Link><Link href="/social" className="rounded-full bg-violet-600 px-4 py-2 text-xs font-black">Ver Muro Credi</Link></div>
        </footer>
      </div>
    </main>
  );
}
