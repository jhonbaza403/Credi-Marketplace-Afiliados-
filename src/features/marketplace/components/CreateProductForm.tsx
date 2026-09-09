"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "producto";
}

export default function CreateProductForm() {
  const router = useRouter();
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Debes iniciar sesión para publicar un producto.");

      const cleanTitle = title.trim();
      const numericPrice = Number(price);
      const numericStock = Number(stock);
      if (cleanTitle.length < 2) throw new Error("El título debe tener al menos 2 caracteres.");
      if (!Number.isFinite(numericPrice) || numericPrice < 0) throw new Error("Introduce un precio válido.");
      if (!Number.isInteger(numericStock) || numericStock < 0) throw new Error("Introduce un stock válido.");

      let { data: store } = await supabase.from("stores").select("id").eq("vendor_id", user.id).maybeSingle();
      if (!store) {
        const baseSlug = `${slugify(cleanTitle)}-${user.id.slice(0, 8)}`;
        const { data: createdStore, error: storeError } = await supabase.from("stores").insert({
          vendor_id: user.id,
          store_name: `Tienda de ${user.email?.split("@")[0] ?? "usuario"}`,
          slug: baseSlug,
          description: "Tienda personal de Credi Marketplace",
          is_verified: false,
          is_active: true,
        }).select("id").single();
        if (storeError) throw storeError;
        store = createdStore;
      }

      const image = imageUrl.trim();
      const { error: productError } = await supabase.from("products").insert({
        store_id: store.id,
        title: cleanTitle,
        slug: `${slugify(cleanTitle)}-${crypto.randomUUID().slice(0, 8)}`,
        description: description.trim() || null,
        price: numericPrice,
        stock: numericStock,
        image_url: image || null,
        images: image ? [image] : [],
        is_active: true,
      });
      if (productError) throw productError;

      router.replace("/products");
      router.refresh();
    } catch (err: unknown) {
      console.error("[CreateProductForm] product creation error", err);
      setError(err instanceof Error ? err.message : "No fue posible publicar el producto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" aria-label="Publicar producto">
      {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-600">{error}</p>}
      <label className="block text-sm font-semibold">Título<input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30" aria-label="Título del producto" /></label>
      <label className="block text-sm font-semibold">Descripción<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30" aria-label="Descripción del producto" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Precio<input required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none" aria-label="Precio del producto" /></label>
        <label className="block text-sm font-semibold">Stock<input required type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none" aria-label="Stock del producto" /></label>
      </div>
      <label className="block text-sm font-semibold">Imagen (URL opcional)<input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none" placeholder="https://..." aria-label="URL de imagen del producto" /></label>
      <button type="submit" disabled={saving} aria-busy={saving} className="w-full rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">{saving ? "Publicando..." : "Publicar producto"}</button>
    </form>
  );
}
