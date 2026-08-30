// ==========================================================
// CREDI MARKETPLACE
// Affiliate Commission Service
// ==========================================================


import { createServerClient }
from '@/lib/supabase/server';



export interface CommissionInput {


 orderId:string;

 affiliateId:string;

 amount:number;

 rate:number;

}




export async function createCommission(
 input:CommissionInput
){


 const commissionAmount =
 Number(
  (
   input.amount *
   input.rate
  )
  .toFixed(2)
 );



 const supabase =
 await createServerClient();



 const {
  data,
  error
 }
 =
 await supabase
 .from('affiliate_commissions')
 .insert({

   order_id:
    input.orderId,


   affiliate_id:
    input.affiliateId,


   amount:
    commissionAmount,


   rate:
    input.rate,


   status:
    'pending'


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
