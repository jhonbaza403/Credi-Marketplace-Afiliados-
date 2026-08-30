// ==========================================================
// CREDI MARKETPLACE
// Inventory Business Service
// Next.js 16.3 · Supabase
// ==========================================================


import { createServerClient }
from '@/lib/supabase/server';



export interface InventoryItem {

 productId:string;

 quantity:number;

}



export interface StockReservation {

 productId:string;

 quantity:number;

 orderId:string;

}




// ==========================================================
// GET STOCK
// ==========================================================


export async function getProductStock(
 productId:string
){


 const supabase =
 await createServerClient();



 const {
  data,
  error
 }
 =
 await supabase
 .from('inventory')
 .select(
  'available_quantity,reserved_quantity'
 )
 .eq(
  'product_id',
  productId
 )
 .single();



 if(error){

  throw new Error(
   error.message
  );

 }



 return data;

}






// ==========================================================
// CHECK AVAILABILITY
// ==========================================================


export async function checkAvailability(
 items:InventoryItem[]
){


 const supabase =
 await createServerClient();



 for(const item of items){


  const stock =
  await getProductStock(
   item.productId
  );



  const available =
   stock.available_quantity -
   stock.reserved_quantity;



  if(
    available < item.quantity
  ){

    return false;

  }


 }



 return true;

}







// ==========================================================
// RESERVE STOCK
// ==========================================================


export async function reserveInventory(
 orderId:string,
 items:InventoryItem[]
){


 const supabase =
 await createServerClient();



 const {
  data,
  error
 }
 =
 await supabase
 .rpc(
   'reserve_inventory',
   {

    p_order_id:
      orderId,


    p_items:
      items

   }
 );



 if(error){

  throw new Error(
   error.message
  );

 }



 return data;

}







// ==========================================================
// RELEASE RESERVATION
// ==========================================================


export async function releaseInventory(
 orderId:string
){


 const supabase =
 await createServerClient();



 const {
  data,
  error
 }
 =
 await supabase
 .rpc(
   'release_inventory_reservation',
   {

    p_order_id:
      orderId

   }
 );



 if(error){

  throw new Error(
   error.message
  );

 }



 return data;

}
