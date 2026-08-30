// ==========================================================
// CREDI MARKETPLACE
// Cart Business Service
// Next.js 16.3 · Supabase
// ==========================================================


import { createServerClient }
from '@/lib/supabase/server';



export interface AddCartItemInput {

 userId:string;

 productId:string;

 quantity:number;

}




export interface UpdateCartItemInput {

 cartItemId:string;

 quantity:number;

}



// ==========================================================
// GET USER CART
// ==========================================================


export async function getCart(
 userId:string
){


 const supabase =
 await createServerClient();



 const {
  data,
  error
 }
 =
 await supabase
 .from('cart_items')
 .select(`
    *,
    products(*)
 `)
 .eq(
    'user_id',
    userId
 );



 if(error){

  throw new Error(
    error.message
  );

 }


 return data;

}





// ==========================================================
// ADD ITEM
// ==========================================================


export async function addCartItem(
 input:AddCartItemInput
){


 const supabase =
 await createServerClient();



 if(input.quantity <= 0){

   throw new Error(
    'Invalid quantity'
   );

 }



 const {
  data,
  error
 }
 =
 await supabase
 .from('cart_items')
 .upsert({

   user_id:
    input.userId,


   product_id:
    input.productId,


   quantity:
    input.quantity

 })
 .select()
 .single();



 if(error){

  throw new Error(
    error.message
  );

 }



 return data;

}





// ==========================================================
// UPDATE QUANTITY
// ==========================================================


export async function updateCartItem(
 input:UpdateCartItemInput
){


 const supabase =
 await createServerClient();



 if(input.quantity <= 0){

  throw new Error(
   'Quantity must be greater than zero'
  );

 }



 const {
  data,
  error
 }
 =
 await supabase
 .from('cart_items')
 .update({

   quantity:
    input.quantity

 })
 .eq(
   'id',
   input.cartItemId
 )
 .select()
 .single();



 if(error){

  throw new Error(
   error.message
  );

 }



 return data;

}







// ==========================================================
// REMOVE ITEM
// ==========================================================


export async function removeCartItem(
 cartItemId:string
){


 const supabase =
 await createServerClient();



 const {
  error
 }
 =
 await supabase
 .from('cart_items')
 .delete()
 .eq(
  'id',
  cartItemId
 );



 if(error){

  throw new Error(
   error.message
  );

 }



 return true;

}







// ==========================================================
// CLEAR CART
// ==========================================================


export async function clearCart(
 userId:string
){


 const supabase =
 await createServerClient();



 const {
  error
 }
 =
 await supabase
 .from('cart_items')
 .delete()
 .eq(
  'user_id',
  userId
 );



 if(error){

  throw new Error(
   error.message
  );

 }



 return true;

}
