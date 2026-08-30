// ==========================================================
// ARCHIVO: src/lib/database/mutations.ts
// Credi Marketplace
//
// Database Mutations Layer
//
// INSERT / UPDATE / DELETE
//
// Next.js App Router
// Supabase
// ==========================================================


import {
  getDatabaseServerClient,
} from "./server";




// ==========================================================
// CREAR PRODUCTO
// ==========================================================

export async function createProduct(

  payload: Record<string, unknown>,

) {


  const supabase =
    await getDatabaseServerClient();



  const {
    data,
    error,
  } =
    await supabase

      .from("products")

      .insert(
        payload,
      )

      .select()

      .single();



  if (error) {

    throw new Error(
      error.message,
    );

  }



  return data;

}




// ==========================================================
// ACTUALIZAR PRODUCTO
// ==========================================================

export async function updateProduct(

  id: string,

  payload: Record<string, unknown>,

) {


  const supabase =
    await getDatabaseServerClient();



  const {
    data,
    error,
  } =
    await supabase

      .from("products")

      .update(
        payload,
      )

      .eq(
        "id",
        id,
      )

      .select()

      .single();



  if (error) {

    throw new Error(
      error.message,
    );

  }



  return data;

}




// ==========================================================
// CREAR ORDEN
// ==========================================================

export async function createOrder(

  payload: Record<string, unknown>,

) {


  const supabase =
    await getDatabaseServerClient();



  const {
    data,
    error,
  } =
    await supabase

      .from("orders")

      .insert(
        payload,
      )

      .select()

      .single();



  if (error) {

    throw new Error(
      error.message,
    );

  }



  return data;

}




// ==========================================================
// ACTUALIZAR ESTADO DE ORDEN
// ==========================================================

export async function updateOrderStatus(

  orderId: string,

  status: string,

) {


  const supabase =
    await getDatabaseServerClient();



  const {
    data,
    error,
  } =
    await supabase

      .from("orders")

      .update({

        status,

      })

      .eq(

        "id",

        orderId,

      )

      .select()

      .single();



  if (error) {

    throw new Error(
      error.message,
    );

  }



  return data;

}




// ==========================================================
// ACTUALIZAR INVENTARIO
// ==========================================================

export async function updateInventory(

  productId: string,

  quantity: number,

) {


  const supabase =
    await getDatabaseServerClient();



  const {
    data,
    error,
  } =
    await supabase

      .from("inventory")

      .update({

        quantity,

      })

      .eq(

        "product_id",

        productId,

      )

      .select()

      .single();



  if (error) {

    throw new Error(
      error.message,
    );

  }



  return data;

}
