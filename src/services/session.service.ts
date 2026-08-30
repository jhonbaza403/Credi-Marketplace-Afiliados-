// ==========================================================
// Session Service
// ==========================================================


import { createServerClient }
from '@/lib/supabase/server';



export async function getSession(){

 const supabase =
 await createServerClient();


 const {
  data
 }
 =
 await supabase.auth.getSession();


 return data.session;

}
