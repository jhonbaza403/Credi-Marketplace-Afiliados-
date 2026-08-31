// ==========================================================
// B2B Service
// ==========================================================


import { createServerClient }
from '@/lib/supabase/server';



export async function createB2BRequest(
 data:Record<string,unknown>
){


 const supabase =
 await createServerClient();


 const {
  data:result,
  error
 }
 =
 await supabase
 .from('b2b_requests')
 .insert(data)
 .select()
 .single();



 if(error){

  throw new Error(error.message);

 }


 return result;

}
