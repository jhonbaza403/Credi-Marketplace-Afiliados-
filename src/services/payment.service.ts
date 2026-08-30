// ==========================================================
// CREDI MARKETPLACE
// Payment Business Service
// Next.js 16.3 · Supabase
// ==========================================================

import { createServerClient } from '@/lib/supabase/server';


export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';



export interface CreatePaymentIntentInput {

  orderId:string;

  userId:string;

  amount:number;

  currency:string;

  provider:string;

}



export async function createPaymentIntent(
 input:CreatePaymentIntentInput
){


 const supabase =
 await createServerClient();


 const {
   data,
   error
 } =
 await supabase
 .from('payment_intents')
 .insert({

   order_id: input.orderId,

   user_id: input.userId,

   amount: input.amount,

   currency: input.currency,

   provider: input.provider,

   status:'pending'

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






export async function getPaymentByOrderId(
 orderId:string
){


 const supabase =
 await createServerClient();


 const {
   data,
   error
 } =
 await supabase
 .from('payments')
 .select('*')
 .eq(
   'order_id',
   orderId
 )
 .maybeSingle();



 if(error){

   throw new Error(
    error.message
   );

 }


 return data;

}
