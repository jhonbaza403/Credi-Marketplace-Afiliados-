import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface ProductRow { id: string; title: string; slug: string; description: string | null; price: number; stock: number; images: string[] | null; is_active: boolean; }
interface Props { params: Promise<{ slug: string }> }

async function getProduct(slug: string): Promise<ProductRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("id,title,slug,description,price,stock,images,is_active").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error) { console.error("Product lookup failed", error); return null; }
  return data as ProductRow | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product?.title ?? "Producto", description: product?.description?.slice(0, 160) ?? "Producto de Credi Marketplace." };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const image = product.images?.[0];
  return <main className="mx-auto min-h-screen max-w-6xl px-4 py-12 sm:px-6 lg:px-8"><Link href="/marketplace" className="text-sm font-semibold text-brand-600">← Marketplace</Link><div className="mt-8 grid gap-10 lg:grid-cols-2"><section className="overflow-hidden rounded-3xl border border-marketplace-border bg-white">{image ? <img src={image} alt={product.title} className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-neutral-100" />}</section><section><h1 className="text-4xl font-black tracking-tight">{product.title}</h1><p className="mt-5 text-3xl font-black text-brand-600">{Number(product.price).toFixed(2)}</p><p className="mt-6 leading-7 text-neutral-600">{product.description ?? "Producto disponible en Credi Marketplace."}</p><p className="mt-6 text-sm font-semibold">{product.stock > 0 ? `${product.stock} unidades disponibles` : "Agotado"}</p></section></div></main>;
}
