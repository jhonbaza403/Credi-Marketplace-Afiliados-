// ==========================================================
// CREDI MARKETPLACE
// Affiliate Tracking Service
// ==========================================================


import { createServerClient }
from '@/lib/supabase/server';



export interface AffiliateTrackingInput {

 affiliateId:string;

 userId?:string;

 sessionId:string;

 source?:string;

 campaign?:string;

}



export async function createAffiliateTracking(
 input:AffiliateTrackingInput
){


 const supabase =
 await createServerClient();



 const {
  data,
  error
 }
 =
 await supabase
 .from('affiliate_tracking')
 .insert({

   affiliate_id:
    input.affiliateId,


   user_id:
    input.userId ?? null,


   session_id:
    input.sessionId,


   source:
    input.source ?? null,


   campaign:
    input.campaign ?? null


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
