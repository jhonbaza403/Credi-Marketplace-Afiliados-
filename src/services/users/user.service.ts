// ==========================================================
// User Service
// ==========================================================


import { createServerClient }
from '@/lib/supabase/server';



export async function getUserProfile(
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
 .from('profiles')
 .select('*')
 .eq(
  'id',
  userId
 )
 .single();



 if(error){

  throw new Error(error.message);

 }


 return data;

}
