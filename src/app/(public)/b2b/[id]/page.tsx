import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type B2BProduct = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  wholesale_price_usd: number;
  regular_price_usd: number;
  min_order_quantity: number;
  stock_available: number;
  image_url: string | null;
  video_media: Array<{ url?: string; kind?: string }> | null;
  country: string | null;
  supplier_id: string;
  created_at: string;
};

interface PageProps { params: Promise<{ id: string }> }

async function getB2BProduct(id: string): Promise<B2BProduct | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase.from("verified_b2b_products").select("id,title,description,category,wholesale_price_usd,regular_price_usd,min_order_quantity,stock_available,image_url,video_media,country,supplier_id,created_at").eq("id", id).maybeSingle();
  if (error) { console.error("[b2b/detail] catalog lookup failed", error); return null; }
  return data as B2BProduct | null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getB2BProduct(id);
  return product ? {
    title: `${product.title} | Mercado B2B Credi`,
    description: product.description || `Oferta mayorista de ${product.title} en Credi Marketplace.`,
    alternates: { canonical: `/b2b/${id}` },
  } : { title: "Oferta B2B | Credi Marketplace", robots: { index: false, follow: false } };
}

export default async function B2BProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/b2b/${id}`)}`);
  const product = await getB2BProduct(id);
  if (!product) notFound();

  const available = product.stock_available >= product.min_order_quantity && product.stock_available > 0;
  const chatHref = `/chat?b2bProduct=${encodeURIComponent(product.id)}&supplier=${encodeURIComponent(product.supplier_id)}`;
  const videos = (product.video_media || []).filter((item) => typeof item.url === "string" && item.url.trim());

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/b2b" className="inline-flex rounded-xl px-2 py-2 text-sm font-bold text-[var(--muted)] hover:bg-[var(--surface-secondary)]">← Volver al mercado B2B</Link>
        <section className="mt-5 grid overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-xl lg:grid-cols-2">
          <div className="space-y-3 bg-[var(--surface-secondary)] p-4 sm:p-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--surface)]">
              {product.image_url ? <Image src={product.image_url} alt={product.title} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover"/> : <div className="flex h-full items-center justify-center text-5xl">📦</div>}
            </div>
            {videos.map((video,index)=><video key={video.url} src={video.url} controls playsInline preload="metadata" className="max-h-[420px] w-full rounded-2xl bg-black" aria-label={`Vídeo de ${product.title} ${index+1}`}/>)}
          </div>
          <div className="flex flex-col p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap gap-2"><span className="rounded-full bg-amber-400/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-600">{product.category || "General"}</span><span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">{product.country || "Internacional"}</span></div>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{product.title}</h1>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">{product.description || "El proveedor no ha añadido una descripción adicional."}</p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Precio mayorista</p><p className="mt-2 text-2xl font-black">${Number(product.wholesale_price_usd).toFixed(2)} USD</p></div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Precio de referencia</p><p className="mt-2 text-2xl font-black">${Number(product.regular_price_usd).toFixed(2)} USD</p></div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Pedido mínimo</p><p className="mt-2 text-xl font-black">{product.min_order_quantity.toLocaleString("es")}</p></div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Stock disponible</p><p className={`mt-2 text-xl font-black ${available?"text-emerald-600":"text-rose-600"}`}>{product.stock_available.toLocaleString("es")}</p></div>
            </div>
            {!available && <p role="status" className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-700">La oferta no alcanza actualmente el pedido mínimo o no tiene stock suficiente.</p>}
            <div className="mt-auto space-y-3 pt-8">
              <Link href={chatHref} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3.5 text-sm font-black text-white"><MessageCircle size={17}/> Contactar proveedor en Credi Chat</Link>
              <Link href="/abastecimiento" className="flex w-full items-center justify-center rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-bold">Crear solicitud de abastecimiento</Link>
              <p className="flex items-start gap-2 text-[11px] leading-5 text-[var(--muted)]"><ShieldCheck size={15} className="mt-0.5 shrink-0"/> Las condiciones definitivas, cotizaciones, adjudicación y pedidos se confirman mediante los flujos B2B del servidor. Esta ficha no confirma un pago.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
