import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,store_id,category_id,title,slug,price,stock,images,is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { error: "PRODUCTS_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  }

  const products = (data ?? []).map((product) => ({
    id: product.id,
    storeId: product.store_id,
    categoryId: product.category_id,
    title: product.title,
    slug: product.slug,
    price: Number(product.price),
    stock: product.stock,
    images: Array.isArray(product.images) ? product.images : [],
    isActive: product.is_active,
  }));

  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } },
  );
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
