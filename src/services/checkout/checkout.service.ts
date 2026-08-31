// ==========================================================
// CREDI MARKETPLACE
// Checkout Business Service
// Next.js 16.3 · Supabase
// ==========================================================


import { createServerClient }
from '@/lib/supabase/server';


import {
 createPaymentIntent
}
from '@/services/payments/payment.service';



export interface CheckoutItem {

 productId:string;

 quantity:number;

 price:number;

}



export interface CheckoutInput {


 userId:string;


 items:CheckoutItem[];


 currency:string;


 paymentProvider:string;

}




// ==========================================================
// CREATE CHECKOUT
// ==========================================================


export async function createCheckout(
 input:CheckoutInput
){


 const supabase =
 await createServerClient();



 /*
    1.
    Validar usuario
 */


 if(!input.userId){

   throw new Error(
    'User authentication required'
   );

 }



 /*
    2.
    Validar carrito
 */


 if(
   !input.items ||
   input.items.length===0
 ){

   throw new Error(
    'Checkout requires products'
   );

 }




 /*
    3.
    Crear orden pendiente

    Usa RPC transaccional:
    
    create_pending_order_batch

 */


 const {
   data:order,
   error:orderError

 }
 =
 await supabase
 .rpc(
   'create_pending_order_batch',
   {

    p_user_id:
      input.userId,


    p_items:
      input.items

   }
 );




 if(orderError){

   throw new Error(
    orderError.message
   );

 }




 /*
    4.
    Crear intención de pago

 */


 const paymentIntent =
 await createPaymentIntent({

   orderId:
    order.id,


   userId:
    input.userId,


   amount:
    order.total,


   currency:
    input.currency,


   provider:
    input.paymentProvider

 });





 return {


   order,


   paymentIntent


 };


}
