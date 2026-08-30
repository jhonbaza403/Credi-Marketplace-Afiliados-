// ==========================================================
// ARCHIVO: src/lib/database/queries.ts
// Credi Marketplace
//
// Database Queries Layer
//
// Lecturas centralizadas Supabase
//
// Next.js App Router
// TypeScript
// ==========================================================

import {
  getDatabaseServerClient,
} from "./server";


// ==========================================================
// PRODUCTOS
// ==========================================================

export async function getProducts(
  limit = 20,
) {

  const supabase =
    await getDatabaseServerClient();


  const {
    data,
    error,
  } =
    await supabase

      .from("products")

      .select("*")

      .limit(limit);



  if (error) {

    throw new Error(
      error.message,
    );

  }


  return data ?? [];

}





export async function getProductById(
  id: string,
) {

  const supabase =
    await getDatabaseServerClient();


  const {
    data,
    error,
  } =
    await supabase

      .from("products")

      .select("*")

      .eq(
        "id",
        id,
      )

      .single();



  if (error) {

    throw new Error(
      error.message,
    );

  }


  return data;

}





export async function getProductBySlug(
  slug: string,
) {

  const supabase =
    await getDatabaseServerClient();


  const {
    data,
    error,
  } =
    await supabase

      .from("products")

      .select("*")

      .eq(
        "slug",
        slug,
      )

      .single();



  if (error) {

    throw new Error(
      error.message,
    );

  }


  return data;

}





// ==========================================================
// USUARIOS
// ==========================================================

export async function getUserProfile(
  userId: string,
) {

  const supabase =
    await getDatabaseServerClient();


  const {
    data,
    error,
  } =
    await supabase

      .from("profiles")

      .select("*")

      .eq(
        "id",
        userId,
      )

      .single();



  if (error) {

    throw new Error(
      error.message,
    );

  }


  return data;

}





// ==========================================================
// ORDENES
// ==========================================================

export async function getUserOrders(
  userId: string,
) {

  const supabase =
    await getDatabaseServerClient();


  const {
    data,
    error,
  } =
    await supabase

      .from("orders")

      .select(
        `
          *,
          order_items(*)
        `,
      )

      .eq(
        "user_id",
        userId,
      )

      .order(
        "created_at",
        {
          ascending: false,
        },
      );



  if (error) {

    throw new Error(
      error.message,
    );

  }


  return data ?? [];

}





// ==========================================================
// AFILIADOS
// ==========================================================

export async function getAffiliateByUser(
  userId: string,
) {

  const supabase =
    await getDatabaseServerClient();


  const {
    data,
    error,
  } =
    await supabase

      .from("affiliates")

      .select("*")

      .eq(
        "user_id",
        userId,
      )

      .single();



  if (error) {

    throw new Error(
      error.message,
    );

  }


  return data;

}





// ==========================================================
// INVENTARIO
// ==========================================================

export async function getInventoryByProduct(
  productId: string,
) {

  const supabase =
    await getDatabaseServerClient();


  const {
    data,
    error,
  } =
    await supabase

      .from("inventory")

      .select("*")

      .eq(
        "product_id",
        productId,
      )

      .single();



  if (error) {

    throw new Error(
      error.message,
    );

  }


  return data;

}
