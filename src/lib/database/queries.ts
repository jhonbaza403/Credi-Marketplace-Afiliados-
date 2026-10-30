import "server-only";

import { getDatabaseServerClient } from "./server";
import { isPlaywrightSupabasePlaceholder } from "./test-runtime";

export async function getProducts(limit = 20) {
  // Playwright starts Next with a deliberately fake local Supabase endpoint.
  // Do not make server-side requests to a Supabase service that the E2E job
  // does not start. Real local/preview/production credentials still query normally.
  if (
    isPlaywrightSupabasePlaceholder(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    )
  ) {
    return [];
  }

  const supabase = await getDatabaseServerClient();

  const { data, error } = await supabase
    .from("published_products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[database.getProducts] Catalog query failed", {
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return data ?? [];
}

export async function getProductById(id: string) {
  const supabase = await getDatabaseServerClient();
  const { data, error } = await supabase
    .from("published_products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getProductBySlug(slug: string) {
  const supabase = await getDatabaseServerClient();
  const { data, error } = await supabase
    .from("published_products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getUserProfile(userId: string) {
  const supabase = await getDatabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getUserOrders(buyerId: string) {
  const supabase = await getDatabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAffiliateByUser(userId: string) {
  const supabase = await getDatabaseServerClient();
  const { data, error } = await supabase
    .from("affiliates")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getInventoryByProduct(productId: string) {
  const supabase = await getDatabaseServerClient();
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
