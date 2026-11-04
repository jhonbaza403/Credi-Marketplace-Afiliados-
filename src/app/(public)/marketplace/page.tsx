import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Compass,
  PackageCheck,
  Radio,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import DomainBridge from "@/components/portal/DomainBridge";
import CrediServicePortalNav from '@/components/portal/CrediServicePortalNav'
import ProductCard from "@/features/marketplace/components/ProductCard";
import { getProducts } from "@/lib/database/queries";
import type { Product } from "@/types/product";

export const metadata: Metadata = {
  title: "Marketplace | Credi Marketplace",
  description: "Descubre productos, tiendas y oportunidades de comercio conectadas con la comunidad Credi.",
};

export const revalidate = 60;

function collectImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((candidate): candidate is string =>
    typeof candidate === "string" && candidate.trim().length > 0
  ).map((image) => image.trim());
}

const shortcuts = [
  {
    title: "Comprar productos",
    description: "Explora las ofertas disponibles de vendedores de Credi.",
    href: "#catalogo",
    icon: ShoppingBag,
    tone: "from-cyan-400/20 to-blue-500/10",
  },
  {
    title: "Vender en Credi",
    description: "Prepara una ficha clara con precio, imágenes y disponibilidad.",
    href: "/products/create",
    icon: Store,
    tone: "from-violet-400/20 to-fuchsia-500/10",
  },
  {
    title: "Comprar al mayor",
    description: "Encuentra oportunidades y proveedores para tu negocio.",
    href: "/b2b",
    icon: Building2,
    tone: "from-amber-400/20 to-orange-500/10",
  },
  {
    title: "Conectar y negociar",
    description: "Continúa una conversación comercial desde Credi Chat.",
    href: "/chat",
    icon: Users,
    tone: "from-emerald-400/20 to-teal-500/10",
  },
];

export default async function MarketplacePage() {
  const data = await getProducts(50);

  const products: Product[] = data.map((row) => {
    const images = collectImageUrls(row.images);
    const imageUrl =
      typeof row.image_url === "string" && row.image_url.trim().length > 0
        ? row.image_url.trim()
        : null;

    return {
      id: row.id,
      storeId: row.store_id,
      categoryId: row.category_id ?? null,
      title: row.title,
      slug: row.slug,
      description: row.description ?? null,
      price: Number(row.price ?? 0),
      stock: Number(row.stock ?? 0),
      images: images.length > 0 ? images : imageUrl ? [imageUrl] : [],
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? null,
      store_id: row.store_id,
      category_id: row.category_id,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <DomainBridge context="marketplace" />
        <CrediServicePortalNav />

        <section className="relative isolate overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-[linear-gradient(120deg,#071629_0%,#10284b_52%,#271447_100%)] px-5 py-8 text-white shadow-[0_28px_90px_rgba(2,8,28,.28)] sm:px-9 sm:py-11 lg:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full bg-cyan-300/15 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-1/3 size-80 rounded-full bg-violet-400/15 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.65fr)]">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/[.07] px-3 py-1.5 text-[11px] font-black uppercase tracking-[.17em] text-cyan-100">
                <Sparkles className="size-4" /> Credi Marketplace
              </span>
              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Descubre. Conecta. <span className="text-cyan-200">Haz comercio.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
                Un mercado conectado con personas, tiendas y empresas. Encuentra productos, presenta tus ofertas y continúa cada oportunidad desde el mismo ecosistema.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="#catalogo" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-200">
                  Explorar catálogo <ArrowRight className="size-4" />
                </Link>
                <Link href="/products/create" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/[.07] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[.13]">
                  <Store className="size-4" /> Ofrecer un producto
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-300">
                <span className="inline-flex items-center gap-2"><PackageCheck className="size-4 text-cyan-200" /> Ofertas publicadas</span>
                <span className="inline-flex items-center gap-2"><BadgeCheck className="size-4 text-cyan-200" /> Controles de confianza</span>
                <span className="inline-flex items-center gap-2"><Radio className="size-4 text-cyan-200" /> Comercio conectado a LIVE</span>
              </div>
            </div>
            <div className="relative rounded-[1.75rem] border border-white/10 bg-white/[.06] p-5 shadow-2xl backdrop-blur-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-[.16em] text-cyan-100">Un solo ecosistema</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"><ShoppingBag className="size-5 text-cyan-200" /><p className="mt-3 text-sm font-black">B2C</p><p className="mt-1 text-xs leading-5 text-slate-300">Compra y venta directa</p></div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"><Building2 className="size-5 text-violet-200" /><p className="mt-3 text-sm font-black">B2B</p><p className="mt-1 text-xs leading-5 text-slate-300">Negocio mayorista</p></div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"><Users className="size-5 text-emerald-200" /><p className="mt-3 text-sm font-black">Comunidad</p><p className="mt-1 text-xs leading-5 text-slate-300">Personas y conversaciones</p></div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"><Radio className="size-5 text-amber-200" /><p className="mt-3 text-sm font-black">LIVE</p><p className="mt-1 text-xs leading-5 text-slate-300">Presentaciones en directo</p></div>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Accesos del Marketplace" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map(({ title, description, href, icon: Icon, tone }) => (
            <Link key={title} href={href} className={`group rounded-2xl border border-[var(--border)] bg-gradient-to-br ${tone} p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500`}>
              <span className="flex size-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--primary)]"><Icon className="size-5" /></span>
              <h2 className="mt-4 text-base font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[var(--primary)]">Abrir <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </section>

        <section id="catalogo" className="scroll-mt-28 py-10 sm:py-12">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Selección de Credi</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Productos disponibles</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Las ofertas que aparecen aquí cumplen los controles de disponibilidad y visibilidad del catálogo.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--muted)]">
              <Compass className="size-4" /> {products.length} {products.length === 1 ? "producto" : "productos"}
            </span>
          </div>

          {products.length === 0 ? (
            <div className="overflow-hidden rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-6 sm:p-10">
              <div className="mx-auto max-w-2xl text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--surface-secondary)] text-[var(--primary)]"><ShoppingBag className="size-8" /></span>
                <h3 className="mt-5 text-xl font-black">Todavía no hay ofertas visibles</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Cuando una tienda publique un producto y active su visibilidad y disponibilidad, aparecerá aquí. Mientras tanto puedes explorar el comercio mayorista o preparar tu primera oferta.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href="/products/create" className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white">Crear oferta <ArrowRight className="size-4" /></Link>
                  <Link href="/b2b" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] px-5 py-3 text-sm font-black">Explorar B2B <Building2 className="size-4" /></Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
