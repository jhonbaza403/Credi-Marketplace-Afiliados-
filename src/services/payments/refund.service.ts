// ==========================================================
// CREDI MARKETPLACE
// Refund Service
// ==========================================================


import { createServerClient }
from '@/lib/supabase/server';



export async function createRefund(
 paymentId:string,
 amount:number,
 reason:string
){


 const supabase =
 await createServerClient();


 const {
 data,
 error
 }
 =
 await supabase
 .from('refunds')
 .insert({

   payment_id:paymentId,

   amount,

   reason,

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
