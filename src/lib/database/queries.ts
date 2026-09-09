import "server-only";

import { getDatabaseServerClient } from "./server";

export async function getProducts(limit = 20) {
  const supabase = await getDatabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
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
  const { data, error } = await supabase.from("products").select("*").eq("id", id).eq("is_active", true).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getProductBySlug(slug: string) {
  const supabase = await getDatabaseServerClient();
  const { data, error } = await supabase.from("products").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getUserProfile(userId: string) {
  const supabase = await getDatabaseServerClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getUserOrders(userId: string) {
  const supabase = await getDatabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAffiliateByUser(userId: string) {
  const supabase = await getDatabaseServerClient();
  const { data, error } = await supabase.from("affiliates").select("*").eq("user_id", userId).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getInventoryByProduct(productId: string) {
  const supabase = await getDatabaseServerClient();
  const { data, error } = await supabase.from("inventory").select("*").eq("product_id", productId).single();
  if (error) throw new Error(error.message);
  return data;
}
