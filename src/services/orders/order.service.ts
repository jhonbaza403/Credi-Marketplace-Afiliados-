// ==========================================================
// CREDI MARKETPLACE
// Order Business Service
// ==========================================================

import { createServerClient } from '@/lib/supabase/server';


export interface CreateOrderInput {

  userId: string;

  items: {

    productId:string;

    quantity:number;

    price:number;

  }[];

}


export async function createOrder(
 input:CreateOrderInput
){

 const supabase =
 await createServerClient();


 const {
   data,
   error
 } =
 await supabase
 .rpc(
   'create_pending_order_batch',
   {
     p_user_id: input.userId,
     p_items: input.items
   }
 );


 if(error){

   throw new Error(
     error.message
   );

 }


 return data;

}
