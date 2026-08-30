// ==========================================================
// Notification Service
// ==========================================================


import { createServerClient }
from '@/lib/supabase/server';



export async function createNotification(
 userId:string,
 message:string
){


 const supabase =
 await createServerClient();


 const {
  data,
  error
 }
 =
 await supabase
 .from('notifications')
 .insert({

  user_id:userId,

  message,

  read:false

 })
 .select()
 .single();



 if(error){

  throw new Error(error.message);

 }


 return data;

}
