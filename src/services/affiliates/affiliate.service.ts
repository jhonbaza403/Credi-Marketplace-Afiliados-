// ==========================================================
// CREDI MARKETPLACE
// Affiliate Business Service
// ==========================================================


import { createServerClient }
from '@/lib/supabase/server';



export interface Affiliate {

 id:string;

 userId:string;

 code:string;

 active:boolean;

}



export async function getAffiliateByCode(
 code:string
):Promise<Affiliate | null>{


 const supabase =
 await createServerClient();



 const {
  data,
  error
 }
 =
 await supabase
 .from('affiliates')
 .select('*')
 .eq(
   'code',
   code
 )
 .maybeSingle();



 if(error){

  throw new Error(
   error.message
  );

 }


 return data;

}





export async function validateAffiliate(
 affiliateId:string
){


 const supabase =
 await createServerClient();



 const {
  data,
  error
 }
 =
 await supabase
 .from('affiliates')
 .select('active')
 .eq(
  'id',
  affiliateId
 )
 .single();



 if(error){

  throw new Error(
   error.message
  );

 }


 return data.active;

}
