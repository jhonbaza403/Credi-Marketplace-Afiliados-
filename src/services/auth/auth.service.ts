// ==========================================================
// CREDI MARKETPLACE
// Authentication Service
// ==========================================================

import { createServerClient }
from '@/lib/supabase/server';



export async function getCurrentUser(){

 const supabase =
 await createServerClient();


 const {
  data,
  error
 }
 =
 await supabase.auth.getUser();



 if(error){

  return null;

 }


 return data.user;

}





export async function logout(){

 const supabase =
 await createServerClient();


 const {
  error
 }
 =
 await supabase.auth.signOut();


 if(error){

  throw new Error(error.message);

 }


 return true;

}
