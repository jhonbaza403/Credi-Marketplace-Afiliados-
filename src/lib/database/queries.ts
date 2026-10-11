import "server-only";

import { getDatabaseServerClient } from "./server";

export async function getProducts(limit = 20) {
  try {
    const supabase = await getDatabaseServerClient();
    const { data, error } = await supabase
      .from("published_products")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[database.getProducts] Catalog query unavailable", {
        code: error.code,
        message: error.message,
      });
      return [];
    }

    return data ?? [];
  } catch (error) {
    // Public catalog routes must remain renderable when Supabase is unavailable
    // (for example, isolated E2E environments without network credentials).
    // Do not hide the cause: emit a bounded diagnostic without request data.
    console.warn("[database.getProducts] Catalog connection unavailable", {
      message: error instanceof Error ? error.message : "Unknown database error",
    });
    return [];
  }
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
